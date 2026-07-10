import { isMissingDbRelation } from '@/lib/publicApiError';

/** Safe client-facing message when assessment upload hits a DB/schema failure. */
export const ASSESS_UPLOAD_DB_ERROR = 'Database error. Contact support. [Ref: ASSESS-DB-01]';

export const ASSESS_IMPORT_REVIEW_SCHEMA_HINT =
  'Import review tables are missing. Run migration 071: npm run db:migrate:071';

/** @param {unknown} err */
export function isAssessUploadSqlExposure(err) {
  const code = err?.code;
  const msg = String(err?.message || '');
  return code === '42P01' || /missing FROM-clause/i.test(msg);
}

/** True only when Postgres reports missing import-review / assessment-context relations. */
export function isMissingImportReviewSchema(err) {
  if (!isMissingDbRelation(err)) return false;
  const msg = String(err?.message || '').toLowerCase();
  return (
    msg.includes('employer_assessment_import')
    || msg.includes('employer_assessment_contexts')
  );
}

/**
 * Map assessment CSV / import DB failures to safe API responses.
 * @param {unknown} err
 * @returns {{ status: number, message: string }}
 */
export function formatAssessImportApiError(err, { upload = true } = {}) {
  if (isMissingImportReviewSchema(err)) {
    return { status: 503, message: ASSESS_IMPORT_REVIEW_SCHEMA_HINT };
  }
  if (isAssessUploadSqlExposure(err)) {
    return { status: 500, message: ASSESS_UPLOAD_DB_ERROR };
  }

  const code = err?.code;
  const msg = String(err?.message || '');

  if (code === '23503' && msg.includes('employer_assessment_import')) {
    if (/drive_id/i.test(msg)) {
      return {
        status: 400,
        message:
          'Selected placement drive is invalid or was removed. Refresh the page and choose the drive again.',
      };
    }
    if (/job_id/i.test(msg)) {
      return {
        status: 400,
        message:
          'Selected job posting is invalid or was removed. Refresh and choose the posting again.',
      };
    }
    if (/tenant_id/i.test(msg)) {
      return {
        status: 400,
        message: 'Selected campus is invalid for this upload. Choose campus and target again.',
      };
    }
    return {
      status: 400,
      message: 'Upload context is invalid (campus, drive, or job). Refresh the page and try again.',
    };
  }

  if (code === '23514' && msg.includes('employer_assessment_contexts')) {
    return {
      status: 400,
      message: 'Upload target is incomplete — select a placement drive or job posting before uploading.',
    };
  }

  if (code === '22P02' && /uuid/i.test(msg)) {
    return {
      status: 400,
      message: 'Upload context contains an invalid id. Re-export the CSV or refresh drive/job selection.',
    };
  }

  const fallback = upload ? 'Failed to upload results CSV' : 'Failed to list import sessions';
  return { status: 500, message: fallback };
}
