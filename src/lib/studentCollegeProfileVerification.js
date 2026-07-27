import { query } from '@/lib/db';

/**
 * Clear college/committee “Verified” on a student profile (informational badge only —
 * does not affect apply/hiring gates). Call after the student edits permitted
 * profile fields or uploads a CV so staff must re-verify.
 *
 * @param {string} studentProfileId
 * @param {import('pg').PoolClient | null} [client]
 */
export async function clearStudentCollegeProfileVerification(studentProfileId, client = null) {
  if (!studentProfileId) return { cleared: false };
  const run = client ? client.query.bind(client) : query;

  const updated = await run(
    `UPDATE student_profiles
     SET is_verified = false,
         verified_by = NULL,
         verified_at = NULL,
         updated_at = NOW()
     WHERE id = $1::uuid
       AND is_verified = true
     RETURNING user_id`,
    [studentProfileId],
  );

  if (!updated.rows.length) {
    return { cleared: false };
  }

  const userId = updated.rows[0].user_id;
  if (userId) {
    await run(
      `UPDATE users
       SET is_verified = false, updated_at = NOW()
       WHERE id = $1::uuid AND is_verified = true`,
      [userId],
    );
  }

  return { cleared: true, userId };
}

/**
 * @param {string} userId
 * @param {import('pg').PoolClient | null} [client]
 */
export async function clearStudentCollegeProfileVerificationByUserId(userId, client = null) {
  if (!userId) return { cleared: false };
  const run = client ? client.query.bind(client) : query;
  const res = await run(`SELECT id FROM student_profiles WHERE user_id = $1::uuid LIMIT 1`, [userId]);
  const profileId = res.rows[0]?.id;
  if (!profileId) return { cleared: false };
  return clearStudentCollegeProfileVerification(String(profileId), client);
}
