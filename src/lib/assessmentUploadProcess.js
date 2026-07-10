import { commitValidatedAssessmentRows } from '@/lib/assessmentUploadCommit';
import {
  getCell,
  resolveTarget,
  sanitizeUuidInput,
  targetGroupKey,
} from '@/lib/assessmentUploadProcessCore';

export { sanitizeUuidInput, getCell, resolveTarget, targetGroupKey };
export { commitValidatedAssessmentRows } from '@/lib/assessmentUploadCommit';

/** @deprecated use validate + commitValidatedAssessmentRows */
export async function processAssessmentCsvUpload(client, params) {
  const { formatAssessmentUploadErrors, validateAssessmentCsvUpload } = await import(
    '@/lib/assessmentUploadValidate'
  );
  const validation = await validateAssessmentCsvUpload(client, params);
  if (!validation.canCommitDirectly) {
    return {
      ok: false,
      needsReview: validation.invalidCount > 0,
      errors: formatAssessmentUploadErrors(validation.stagingRows),
      totalRows: validation.totalRows,
      acceptedRows: 0,
      rejectedRows: validation.totalRows,
      uploadIds: [],
      stagingRows: validation.stagingRows,
    };
  }
  return commitValidatedAssessmentRows(client, {
    employerId: params.employerId,
    userId: params.userId,
    opportunityKind: params.opportunityKind || 'jobs',
    fileName: params.fileName,
    s3Key: params.s3Key,
    stagingRows: validation.stagingRows,
  });
}
