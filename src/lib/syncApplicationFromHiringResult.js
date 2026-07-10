import { applicationStatusFromHiringResult } from '@/lib/hiringResult';
import { syncPlacementDriveSelectedCount } from '@/lib/employerApplicationCounts';
import { AND_APP_NOT_DELETED, AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';

/**
 * When employer sets hiring_result via assessment CSV / online update, mirror to application status
 * so student, employer pipeline, and college drive counts stay in sync.
 */
export async function syncApplicationStatusFromHiringResult(client, {
  employerId,
  applicationId,
  hiringResult,
  targetDriveId = null,
  targetJobId = null,
}, tracer = null) {
  const t = tracer || { log: () => {} };
  const nextStatus = applicationStatusFromHiringResult(hiringResult);
  t.log('syncApplicationStatusFromHiringResult', 'start', {
    hiringResult, nextStatus, applicationId, targetDriveId, targetJobId,
  });

  if (!nextStatus || !applicationId || !employerId) {
    t.log('syncApplicationStatusFromHiringResult', 'skipped', {
      reason: !nextStatus ? 'no_mapped_status' : !applicationId ? 'no_applicationId' : 'no_employerId',
    });
    return { synced: false };
  }

  if (targetDriveId) {
    t.log('syncApplicationStatusFromHiringResult', 'updating_drive_application', { applicationId, nextStatus });
    const updated = await client.query(
      `UPDATE applications a
       SET status = $1, updated_at = NOW()
       FROM placement_drives d
       WHERE a.id = $2::uuid
         AND d.id = a.drive_id
         AND d.employer_id = $3::uuid
         AND d.id = $4::uuid
         ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}
       RETURNING a.id`,
      [nextStatus, applicationId, employerId, targetDriveId],
    );
    t.log('syncApplicationStatusFromHiringResult', 'drive_update_result', { rowCount: updated.rows.length, nextStatus });
    if (updated.rows.length) {
      await syncPlacementDriveSelectedCount(targetDriveId, client);
      return { synced: true, status: nextStatus };
    }
    return { synced: false };
  }

  if (targetJobId) {
    t.log('syncApplicationStatusFromHiringResult', 'updating_program_application', { applicationId, nextStatus });
    const updated = await client.query(
      `UPDATE program_applications pa
       SET status = $1, updated_at = NOW()
       FROM job_postings jp
       WHERE pa.id = $2::uuid
         AND jp.id = pa.job_id
         AND jp.employer_id = $3::uuid
         AND jp.id = $4::uuid
         ${AND_PA_NOT_DELETED} ${AND_JP_NOT_DELETED}
       RETURNING pa.id`,
      [nextStatus, applicationId, employerId, targetJobId],
    );
    t.log('syncApplicationStatusFromHiringResult', 'program_update_result', { rowCount: updated.rows.length, nextStatus });
    return { synced: updated.rows.length > 0, status: nextStatus };
  }

  t.log('syncApplicationStatusFromHiringResult', 'no_target', { targetDriveId, targetJobId });
  return { synced: false };
}

