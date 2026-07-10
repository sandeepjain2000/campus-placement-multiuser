import { query } from '@/lib/db';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

/**
 * @param {string} userId
 * @returns {Promise<{ id: string, tenant_id: string | null } | null>}
 */
export async function resolveStudentProfileByUserId(userId) {
  if (!userId) return null;
  try {
    const r = await query(
      `SELECT id, tenant_id FROM student_profiles WHERE user_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE} LIMIT 1`,
      [userId],
    );
    return r.rows[0] || null;
  } catch (e) {
    if (e?.code === '42703' && String(e?.message || '').includes('archived_at')) {
      const r = await query(
        `SELECT id, tenant_id FROM student_profiles WHERE user_id = $1::uuid LIMIT 1`,
        [userId],
      );
      return r.rows[0] || null;
    }
    throw e;
  }
}
