import { query } from '@/lib/db';

/**
 * Resolve student_profiles.id for the logged-in student, creating a minimal row if needed.
 * Returns null if the user is not a student or has no tenant_id (cannot attach a profile).
 */
export async function getOrCreateStudentProfileId(userId) {
  const existing = await query(`SELECT id FROM student_profiles WHERE user_id = $1`, [userId]);
  if (existing.rowCount > 0) return existing.rows[0].id;

  const u = await query(
    `SELECT id, tenant_id, role FROM users WHERE id = $1`,
    [userId],
  );
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

  const again = await query(`SELECT id FROM student_profiles WHERE user_id = $1`, [userId]);
  return again.rowCount ? again.rows[0].id : null;
}
