import { transaction } from '@/lib/db';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

const ARCHIVE_COLUMN_HINT =
  'Apply migration db/migrations/052_student_profiles_archived.sql, then retry.';

function isMissingArchiveColumn(error) {
  const msg = String(error?.message || '');
  return error?.code === '42703' && msg.includes('archived');
}

/**
 * Soft-archive a student profile for the tenant (hides from list; deactivates login).
 */
export async function archiveCollegeStudentProfile({ profileId, tenantId, adminUserId }) {
  try {
    return await transaction(async (client) => {
      const row = await client.query(
        `SELECT sp.id, sp.user_id
         FROM student_profiles sp
         WHERE sp.id = $1::uuid AND sp.tenant_id = $2::uuid AND ${SP_ACTIVE_CLAUSE}
         LIMIT 1`,
        [profileId, tenantId],
      );
      if (!row.rows.length) {
        return { ok: false, status: 404, error: 'Student not found or already archived.' };
      }

      const userId = row.rows[0].user_id;
      await client.query(
        `UPDATE student_profiles
         SET archived_at = NOW(), archived_by = $3::uuid, updated_at = NOW()
         WHERE id = $1::uuid AND tenant_id = $2::uuid`,
        [profileId, tenantId, adminUserId],
      );
      await client.query(
        `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1::uuid`,
        [userId],
      );

      try {
        await client.query(
          `INSERT INTO audit_logs (user_id, tenant_id, action, entity_type, entity_id, new_values, created_at)
           VALUES ($1::uuid, $2::uuid, 'student_archive', 'student_profile', $3::uuid, $4::jsonb, NOW())`,
          [adminUserId, tenantId, profileId, JSON.stringify({ profileId })],
        );
      } catch {
        /* audit optional */
      }

      return { ok: true };
    });
  } catch (error) {
    if (isMissingArchiveColumn(error)) {
      return { ok: false, status: 503, error: ARCHIVE_COLUMN_HINT };
    }
    throw error;
  }
}

/** @returns {boolean} */
export function isArchiveSchemaError(error) {
  return isMissingArchiveColumn(error);
}

/**
 * Restore an archived student (super admin). Re-enables login and active list visibility.
 */
export async function restoreCollegeStudentProfile({ profileId, adminUserId }) {
  try {
    return await transaction(async (client) => {
      const row = await client.query(
        `SELECT sp.id, sp.user_id, sp.tenant_id
         FROM student_profiles sp
         WHERE sp.id = $1::uuid AND sp.archived_at IS NOT NULL
         LIMIT 1`,
        [profileId],
      );
      if (!row.rows.length) {
        return { ok: false, status: 404, error: 'Archived student not found or already active.' };
      }

      const { user_id: userId, tenant_id: tenantId } = row.rows[0];

      await client.query(
        `UPDATE student_profiles
         SET archived_at = NULL, archived_by = NULL, updated_at = NOW()
         WHERE id = $1::uuid`,
        [profileId],
      );
      await client.query(
        `UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1::uuid`,
        [userId],
      );

      try {
        await client.query(
          `INSERT INTO audit_logs (user_id, tenant_id, action, entity_type, entity_id, new_values, created_at)
           VALUES ($1::uuid, $2::uuid, 'student_restore', 'student_profile', $3::uuid, $4::jsonb, NOW())`,
          [adminUserId, tenantId, profileId, JSON.stringify({ profileId })],
        );
      } catch {
        /* audit optional */
      }

      return { ok: true, tenantId, userId };
    });
  } catch (error) {
    if (isMissingArchiveColumn(error)) {
      return { ok: false, status: 503, error: ARCHIVE_COLUMN_HINT };
    }
    throw error;
  }
}

export { ARCHIVE_COLUMN_HINT };
