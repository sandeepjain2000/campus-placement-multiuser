/**
 * Student withdrawal is final — no re-apply; excluded from employer applicant and assessment flows.
 */

import { AND_APP_NOT_DELETED, AND_PA_NOT_DELETED } from '@/lib/softDeleteSql';

export const APPLICATION_STATUS_WITHDRAWN = 'withdrawn';

export const WITHDRAWAL_IS_FINAL_STUDENT_MESSAGE =
  'You have withdrawn from this opening. Withdrawal is final — you cannot apply again.';

export const WITHDRAWAL_ASSESSMENT_REJECT_MESSAGE =
  'This student withdrew their application and cannot be included in assessment for this opening.';

export const WITHDRAWAL_CONFIRM_TITLE = 'Withdraw application permanently?';

export const WITHDRAWAL_CONFIRM_BODY = [
  'Withdrawal is final and cannot be undone.',
  '',
  'After you withdraw:',
  '• You cannot apply again to this job, internship, project, or placement drive.',
  '• The employer will not see you in their applicant list.',
  '• Your name cannot be used in employer assessment CSV uploads or online hiring updates.',
  '',
  'Only continue if you are certain you want to leave this opportunity.',
].join('\n');

/** @param {unknown} status */
export function isWithdrawnApplicationStatus(status) {
  return String(status || '').toLowerCase() === APPLICATION_STATUS_WITHDRAWN;
}

/**
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }} db
 * @param {string} studentProfileId
 * @param {{ driveId?: string | null, jobId?: string | null }} target
 */
export async function isStudentWithdrawnFromTarget(db, studentProfileId, { driveId = null, jobId = null } = {}) {
  if (!studentProfileId) return false;
  if (driveId) {
    const r = await db.query(
      `SELECT 1
       FROM applications a
       WHERE a.student_id = $1::uuid AND a.drive_id = $2::uuid AND a.status = $3
         ${AND_APP_NOT_DELETED}
       LIMIT 1`,
      [studentProfileId, driveId, APPLICATION_STATUS_WITHDRAWN],
    );
    return (r.rowCount ?? r.rows.length) > 0;
  }
  if (jobId) {
    const r = await db.query(
      `SELECT 1
       FROM program_applications pa
       WHERE pa.student_id = $1::uuid AND pa.job_id = $2::uuid AND pa.status = $3
         ${AND_PA_NOT_DELETED}
       LIMIT 1`,
      [studentProfileId, jobId, APPLICATION_STATUS_WITHDRAWN],
    );
    return (r.rowCount ?? r.rows.length) > 0;
  }
  return false;
}

/**
 * Profile ids withdrawn from a specific drive or job posting.
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{ rows: { student_profile_id: string }[] }> }} db
 * @param {{ driveId?: string | null, jobId?: string | null }} target
 * @returns {Promise<Set<string>>}
 */
export async function getWithdrawnStudentProfileIdsForTarget(db, { driveId = null, jobId = null } = {}) {
  if (driveId) {
    const r = await db.query(
      `SELECT a.student_id AS student_profile_id
       FROM applications a
       WHERE a.drive_id = $1::uuid AND a.status = $2 ${AND_APP_NOT_DELETED}`,
      [driveId, APPLICATION_STATUS_WITHDRAWN],
    );
    return new Set(r.rows.map((row) => String(row.student_profile_id)));
  }
  if (jobId) {
    const r = await db.query(
      `SELECT pa.student_id AS student_profile_id
       FROM program_applications pa
       WHERE pa.job_id = $1::uuid AND pa.status = $2 ${AND_PA_NOT_DELETED}`,
      [jobId, APPLICATION_STATUS_WITHDRAWN],
    );
    return new Set(r.rows.map((row) => String(row.student_profile_id)));
  }
  return new Set();
}

/**
 * @template {{ student_profile_id: string }} T
 * @param {T[]} students
 * @param {Set<string>} withdrawnIds
 */
export function excludeWithdrawnStudents(students, withdrawnIds) {
  if (!withdrawnIds.size) return students;
  return students.filter((s) => !withdrawnIds.has(String(s.student_profile_id)));
}
