import { query } from '@/lib/db';
import { isAlumniStudent } from '@/lib/studentAlumni';

/** Session JWT may lag profile updates — read is_alumni from DB when needed (server-only). */
export async function resolveAlumniStudentFlag(userId, sessionUser) {
  if (isAlumniStudent(sessionUser)) return true;
  if (!userId) return false;
  try {
    const r = await query(
      `SELECT COALESCE(is_alumni, false) AS is_alumni
       FROM student_profiles
       WHERE user_id = $1::uuid
       LIMIT 1`,
      [userId],
    );
    return Boolean(r.rows[0]?.is_alumni);
  } catch (e) {
    if (e?.code === '42703' && String(e?.message || '').includes('is_alumni')) return false;
    throw e;
  }
}
