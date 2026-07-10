import { resolveInitialHiringResult } from '@/lib/hiringResult';
import { csvEscapeCell } from '@/lib/offersAssessmentStarterCsv';

/** Columns accepted by POST /api/employer/assessments/upload */
export const ASSESSMENT_UPLOAD_CSV_HEADERS = [
  'student_system_id',
  'college_roll_no',
  'placement_drive_id',
  'job_id',
  'tenant_id',
  'college_id',
  'employer_id',
  'candidate_name',
  'hiring_result',
  'remarks',
];

export const ASSESSMENT_UPLOAD_TEMPLATE_FILENAME = 'assessment_upload_template.csv';
export const ASSESSMENT_UPLOAD_STARTER_FILENAME = 'assessment_upload_starter.csv';

export function assessmentExportFilename(kind) {
  return `assessment_upload_${kind}.csv`;
}

/**
 * @param {Array<{
 *   system_id?: string;
 *   student_system_id?: string;
 *   college_roll_no: string;
 *   placement_drive_id?: string;
 *   job_id?: string;
 *   tenant_id?: string;
 *   college_id?: string;
 *   employer_id?: string;
 *   candidate_name?: string;
 *   hiring_result?: string;
 *   remarks?: string;
 * }>} rows
 */
export function buildAssessmentUploadStarterCsv(rows) {
  const lines = [ASSESSMENT_UPLOAD_CSV_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        csvEscapeCell(row.student_system_id ?? row.system_id ?? ''),
        csvEscapeCell(row.college_roll_no ?? ''),
        csvEscapeCell(row.placement_drive_id ?? ''),
        csvEscapeCell(row.job_id ?? ''),
        csvEscapeCell(row.tenant_id ?? ''),
        csvEscapeCell(row.college_id ?? row.tenant_id ?? ''),
        csvEscapeCell(row.employer_id ?? ''),
        csvEscapeCell(row.candidate_name ?? ''),
        csvEscapeCell(row.hiring_result ?? ''),
        csvEscapeCell(row.remarks ?? ''),
      ].join(','),
    );
  }
  return lines.join('\n');
}

/**
 * @param {Record<string, unknown> | null | undefined} assessmentRow
 */
export function defaultHiringResultCells(assessmentRow, { hasApplied = false } = {}) {
  const remarks = String(assessmentRow?.remarks ?? '').trim();
  return {
    hiring_result: resolveInitialHiringResult(assessmentRow?.hiring_result, hasApplied),
    remarks,
  };
}
