import { normalizeHiringResult } from '@/lib/hiringResult';

const REJECTED_HIRING_RESULTS = new Set(['Reject', 'Decline']);

/** @param {string | null | undefined} hiringResult */
export function isRejectedHiringResult(hiringResult) {
  const canonical = normalizeHiringResult(hiringResult);
  return REJECTED_HIRING_RESULTS.has(canonical);
}

/**
 * Summarize an upload from persisted assessment rows (post-edit / current state).
 * @param {Array<{ hiring_result?: string | null }>} rows
 */
export function summarizeAssessmentUploadRows(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let rejected = 0;
  for (const row of list) {
    if (isRejectedHiringResult(row?.hiring_result)) rejected += 1;
  }
  const total = list.length;
  return {
    total_rows: total,
    accepted_rows: total - rejected,
    rejected_rows: rejected,
  };
}

/**
 * Recompute employer_assessment_uploads summary counts from current row data.
 * @param {import('pg').PoolClient} client
 * @param {string} uploadId
 */
export async function recalculateAssessmentUploadSummary(client, uploadId) {
  const rowsRes = await client.query(
    `SELECT hiring_result FROM employer_assessment_rows WHERE upload_id = $1::uuid`,
    [uploadId],
  );
  const summary = summarizeAssessmentUploadRows(rowsRes.rows);
  await client.query(
    `UPDATE employer_assessment_uploads
     SET total_rows = $1,
         accepted_rows = $2,
         rejected_rows = $3
     WHERE id = $4::uuid`,
    [summary.total_rows, summary.accepted_rows, summary.rejected_rows, uploadId],
  );
  return summary;
}
