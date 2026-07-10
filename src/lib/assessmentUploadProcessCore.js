import { isUuid } from '@/lib/tenantContext';
import { AND_APP_NOT_DELETED, AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';

export function sanitizeUuidInput(raw) {
  let s = String(raw ?? '').trim().replace(/^\uFEFF/, '');
  if (!s) return '';
  s = s.replace(/^["']|["']$/g, '').replace(/^\{|\}$/g, '').trim();
  if (s.startsWith('=') && s.length > 2) {
    s = s.replace(/^="|"$/g, '').replace(/^='+/, '').trim();
  }
  return s;
}

export function getCell(row, idx) {
  return idx >= 0 ? String(row[idx] || '').trim() : '';
}

export function targetGroupKey({ driveId, jobId, tenantId }) {
  if (driveId) return `drive:${driveId}`;
  if (jobId && tenantId) return `job:${jobId}:${tenantId}`;
  return '';
}

/**
 * Map CSV placement_drive_id / job_id cells to a single upload target.
 * Job/internship/project exports pre-fill both columns with the same posting UUID.
 */
export function resolveAssessmentTargetIds({ driveId = '', jobId = '' }) {
  const d = sanitizeUuidInput(driveId);
  const j = sanitizeUuidInput(jobId);

  if (d && j) {
    if (d === j) {
      return { driveId: '', jobId: j, error: null };
    }
    return {
      driveId: '',
      jobId: '',
      error:
        'placement_drive_id and job_id both set but differ — re-export from Assessment uploads or leave one column empty',
    };
  }
  if (!d && !j) {
    return {
      driveId: '',
      jobId: '',
      error:
        'Missing placement_drive_id or job_id — select a drive/job above before export, or fill the matching column on this row',
    };
  }
  return { driveId: d, jobId: j, error: null };
}

export async function resolveTarget(client, employerId, { driveId, jobId, tenantId }) {
  if (driveId) {
    if (!isUuid(driveId)) return { error: 'Invalid drive id (must be a UUID).' };
    const drive = await client.query(
      `SELECT id, tenant_id
       FROM placement_drives d
       WHERE d.id = $1::uuid AND d.employer_id = $2::uuid ${AND_DRIVE_NOT_DELETED}
       LIMIT 1`,
      [driveId, employerId],
    );
    if (!drive.rows.length) return { error: 'Drive not found for this employer' };
    return {
      targetDriveId: driveId,
      targetJobId: null,
      tenantId: drive.rows[0].tenant_id,
    };
  }

  if (!jobId || !isUuid(jobId)) return { error: 'Invalid job id' };
  if (!tenantId || !isUuid(tenantId)) return { error: 'tenant_id is required for job uploads' };

  const job = await client.query(
    `SELECT id, jp.job_type FROM job_postings jp
     WHERE jp.id = $1::uuid AND jp.employer_id = $2::uuid ${AND_JP_NOT_DELETED} LIMIT 1`,
    [jobId, employerId],
  );
  if (!job.rows.length) return { error: 'Job not found' };

  const approval = await client.query(
    `SELECT 1 FROM employer_approvals
     WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status = 'approved'
     LIMIT 1`,
    [employerId, tenantId],
  );
  if (!approval.rows.length) return { error: 'Employer is not approved for the selected tenant' };

  return { targetDriveId: null, targetJobId: jobId, tenantId };
}

export async function findApplicationForStudent(client, studentId, targetDriveId, targetJobId) {
  if (targetJobId) {
    const progRes = await client.query(
      `SELECT id
       FROM program_applications pa
       WHERE pa.student_id = $1::uuid
         AND pa.job_id = $2::uuid
         ${AND_PA_NOT_DELETED}
       ORDER BY pa.applied_at DESC
       LIMIT 1`,
      [studentId, targetJobId],
    );
    if (progRes.rows[0]?.id) return progRes.rows[0].id;
  }

  const appRes = await client.query(
    `SELECT id
     FROM applications a
     WHERE a.student_id = $1::uuid ${AND_APP_NOT_DELETED}
       AND (
         ($2::uuid IS NOT NULL AND a.drive_id = $2::uuid) OR
         ($3::uuid IS NOT NULL AND a.job_id = $3::uuid)
       )
     ORDER BY a.applied_at DESC
     LIMIT 1`,
    [studentId, targetDriveId, targetJobId],
  );
  return appRes.rows[0]?.id || null;
}
