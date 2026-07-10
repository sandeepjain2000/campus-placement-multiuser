import { query } from '@/lib/db';
import { programApplicationNotDeletedSql } from '@/lib/migrationReady';
import { AND_APP_NOT_DELETED } from '@/lib/softDeleteSql';
import { resolveInitialHiringResult } from '@/lib/hiringResult';

export { resolveInitialHiringResult };

/**
 * Profile ids with an active application to the selected drive or job posting.
 */
export async function loadAppliedStudentProfileIds(profileIds, { driveId = null, jobId = null } = {}) {
  const applied = new Set();
  if (!profileIds?.length) return applied;

  if (jobId) {
    const paNotDeleted = await programApplicationNotDeletedSql('pa');
    const prog = await query(
      `SELECT DISTINCT pa.student_id AS student_profile_id
       FROM program_applications pa
       WHERE pa.student_id = ANY($1::uuid[])
         AND pa.job_id = $2::uuid
         ${paNotDeleted}`,
      [profileIds, jobId],
    );
    for (const row of prog.rows) applied.add(row.student_profile_id);

    const legacy = await query(
      `SELECT DISTINCT a.student_id AS student_profile_id
       FROM applications a
       WHERE a.student_id = ANY($1::uuid[])
         AND a.job_id = $2::uuid
         ${AND_APP_NOT_DELETED}`,
      [profileIds, jobId],
    );
    for (const row of legacy.rows) applied.add(row.student_profile_id);
  }

  if (driveId) {
    const driveApps = await query(
      `SELECT DISTINCT a.student_id AS student_profile_id
       FROM applications a
       WHERE a.student_id = ANY($1::uuid[])
         AND a.drive_id = $2::uuid
         ${AND_APP_NOT_DELETED}`,
      [profileIds, driveId],
    );
    for (const row of driveApps.rows) applied.add(row.student_profile_id);
  }

  return applied;
}
