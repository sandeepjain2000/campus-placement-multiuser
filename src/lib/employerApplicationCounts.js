import { query } from '@/lib/db';
import { AND_APP_NOT_DELETED, AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

/** Live registration count for a placement drive (active students, not withdrawn). */
export const DRIVE_APPLICANT_COUNT_SUBQUERY = `
  (SELECT COUNT(*)::int
   FROM applications a
   INNER JOIN student_profiles sp ON sp.id = a.student_id AND ${SP_ACTIVE_CLAUSE}
   WHERE a.drive_id = d.id
     AND a.status <> 'withdrawn'
     ${AND_APP_NOT_DELETED})`;

/** Live selected count for a placement drive. */
export const DRIVE_SELECTED_COUNT_SUBQUERY = `
  (SELECT COUNT(*)::int
   FROM applications a
   INNER JOIN student_profiles sp ON sp.id = a.student_id AND ${SP_ACTIVE_CLAUSE}
   WHERE a.drive_id = d.id
     AND LOWER(TRIM(a.status)) = 'selected'
     ${AND_APP_NOT_DELETED})`;

/** Keep placement_drives.registered_count in sync for exports and admin listings. */
export async function syncPlacementDriveRegisteredCount(driveId, client = null) {
  if (!driveId) return;
  const q = client ? client.query.bind(client) : query;
  await q(
    `UPDATE placement_drives d
     SET registered_count = ${DRIVE_APPLICANT_COUNT_SUBQUERY},
         updated_at = NOW()
     WHERE d.id = $1::uuid`,
    [driveId],
  );
}

/** Keep placement_drives.selected_count in sync for college drive cards. */
export async function syncPlacementDriveSelectedCount(driveId, client = null) {
  if (!driveId) return;
  const q = client ? client.query.bind(client) : query;
  await q(
    `UPDATE placement_drives d
     SET selected_count = ${DRIVE_SELECTED_COUNT_SUBQUERY},
         updated_at = NOW()
     WHERE d.id = $1::uuid`,
    [driveId],
  );
}

/** Per job posting: program applicants only (independent of placement drives). */
export const JOB_APPLICANT_COUNT_SUBQUERY = `
  (SELECT COUNT(*)::int
   FROM program_applications pa
   INNER JOIN student_profiles sp ON sp.id = pa.student_id AND ${SP_ACTIVE_CLAUSE}
   WHERE pa.job_id = jp.id
     AND pa.status <> 'withdrawn'
     ${AND_PA_NOT_DELETED})`;
