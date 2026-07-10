import { query } from '@/lib/db';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

/**
 * Resolve student_profiles.id for the logged-in student, creating a minimal row if needed.
 * Returns null if the user is not a student or has no tenant_id (cannot attach a profile).
 */
async function selectActiveStudentProfileId(userId) {
  try {
    const r = await query(
      `SELECT id FROM student_profiles WHERE user_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE} LIMIT 1`,
      [userId],
    );
    return r.rows[0]?.id || null;
  } catch (e) {
    if (e?.code === '42703') {
      const msg = String(e?.message || '');
      if (msg.includes('archived_at') || msg.includes('is_deleted')) {
        const r = await query(`SELECT id FROM student_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
        return r.rows[0]?.id || null;
      }
    }
    throw e;
  }
}

export async function getOrCreateStudentProfileId(userId) {
  const existing = await selectActiveStudentProfileId(userId);
  if (existing) return existing;

  try {
    const archived = await query(
      `SELECT id FROM student_profiles WHERE user_id = $1::uuid AND archived_at IS NOT NULL LIMIT 1`,
      [userId],
    );
    if (archived.rowCount > 0) return null;
  } catch (e) {
    if (!(e?.code === '42703' && String(e?.message || '').includes('archived_at'))) {
      throw e;
    }
  }

  const u = await query(`SELECT id, tenant_id, role FROM users WHERE id = $1::uuid`, [userId]);
  if (u.rowCount === 0 || u.rows[0].role !== 'student' || !u.rows[0].tenant_id) {
    return null;
  }

  const tenantId = u.rows[0].tenant_id;
  const roll = `AUTO-${String(userId).replace(/-/g, '').slice(0, 10)}`;

  await query(
    `INSERT INTO student_profiles (user_id, tenant_id, roll_number)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, tenantId, roll],
  );

  return selectActiveStudentProfileId(userId);
}

/** True when the student has a soft-archived profile (no portal / apply access). */
export async function isStudentProfileArchived(userId) {
  const r = await query(
    `SELECT 1 FROM student_profiles WHERE user_id = $1 AND archived_at IS NOT NULL LIMIT 1`,
    [userId],
  );
  return r.rowCount > 0;
}
