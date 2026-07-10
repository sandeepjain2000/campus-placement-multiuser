import { getCell, sanitizeUuidInput } from '@/lib/assessmentUploadProcessCore';

/**
 * Read a single placement_drive_id / job_id from CSV when every row agrees.
 */
export function inferAssessmentUploadTargetFromCsv(parsed, headerIdx) {
  const driveIds = new Set();
  const jobIds = new Set();

  for (const row of parsed?.rows || []) {
    const d = sanitizeUuidInput(getCell(row, headerIdx.placement_drive_id));
    const j = sanitizeUuidInput(getCell(row, headerIdx.job_id));
    if (d) driveIds.add(d);
    if (j) jobIds.add(j);
  }

  if (driveIds.size > 1) {
    return { driveId: '', jobId: '', error: 'All CSV rows must use the same placement_drive_id' };
  }
  if (jobIds.size > 1) {
    return { driveId: '', jobId: '', error: 'All CSV rows must use the same job_id' };
  }
  if (driveIds.size && jobIds.size) {
    const driveId = [...driveIds][0];
    const jobId = [...jobIds][0];
    if (driveIds.size === 1 && jobIds.size === 1 && driveId === jobId) {
      return { driveId: '', jobId };
    }
    return {
      driveId: '',
      jobId: '',
      error: 'CSV cannot mix placement_drive_id and job_id — use one target type per file',
    };
  }

  return { driveId: [...driveIds][0] || '', jobId: [...jobIds][0] || '' };
}

/**
 * Merge form target with CSV inference and enforce kind-specific rules.
 */
export function resolveAssessmentUploadTarget({ kind, formDriveId, formJobId, inferred }) {
  if (inferred?.error) {
    return { error: inferred.error };
  }

  let driveId = formDriveId || inferred?.driveId || '';
  let jobId = formJobId || inferred?.jobId || '';

  if (driveId && jobId) {
    if (driveId === jobId && kind !== 'drive') {
      return { driveId: '', jobId };
    }
    return { error: 'Provide either a placement drive or a job posting, not both' };
  }

  if (kind === 'drive') {
    if (!driveId) {
      return {
        error:
          'Select a placement drive above, or export a template from the Drive tab so placement_drive_id is filled',
      };
    }
    return { driveId, jobId: '' };
  }

  if (!jobId) {
    return {
      error: 'Select a job posting above, or include job_id on every CSV row',
    };
  }
  return { driveId: '', jobId };
}
