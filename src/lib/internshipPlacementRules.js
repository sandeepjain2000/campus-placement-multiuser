import { query } from '@/lib/db';
import { programApplicationNotDeletedSql, jobPostingNotDeletedSql } from '@/lib/migrationReady';
import {
  MAX_INTERNSHIPS_PER_STUDENT,
  STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE,
} from '@/lib/internshipPlacementMessages';
import { ALUMNI_JOB_TYPES } from '@/lib/studentAlumni';
import { normalizeEmployerMinCgpa } from '@/lib/employerJobDisplay';
import { resolveInternshipDatesFromRow } from '@/lib/internshipPostingMeta';

export { MAX_INTERNSHIPS_PER_STUDENT, STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE };

/**
 * @typedef {{
 *   locked: boolean;
 *   selectedJobId: string | null;
 *   selection: {
 *     applicationId: string;
 *     jobId: string;
 *     title: string;
 *     companyName: string;
 *     website: string | null;
 *     status: string;
 *     appliedAt: string | null;
 *   } | null;
 * }} InternshipSelectionLock
 */

/**
 * Student holds at most one selected internship — first selection wins (FCFS).
 * @param {string | null | undefined} studentId
 * @returns {Promise<InternshipSelectionLock>}
 */
export async function getStudentInternshipSelectionLock(studentId) {
  if (!studentId) {
    return { locked: false, selectedJobId: null, selection: null };
  }

  const paNotDeleted = await programApplicationNotDeletedSql('pa');
  const jpNotDeleted = await jobPostingNotDeletedSql('jp');

  const res = await query(
    `SELECT pa.id AS application_id,
            pa.job_id,
            pa.status,
            pa.applied_at,
            jp.title,
            ep.company_name,
            ep.website
     FROM program_applications pa
     JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
     JOIN employer_profiles ep ON ep.id = jp.employer_id
     WHERE pa.student_id = $1::uuid
       AND LOWER(TRIM(pa.status)) = 'selected'
       ${paNotDeleted}
       ${jpNotDeleted}
     ORDER BY pa.updated_at ASC NULLS LAST, pa.applied_at ASC NULLS LAST
     LIMIT 1`,
    [studentId],
  );

  if (!res.rows.length) {
    return { locked: false, selectedJobId: null, selection: null };
  }

  const r = res.rows[0];
  return {
    locked: true,
    selectedJobId: r.job_id,
    selection: {
      applicationId: r.application_id,
      jobId: r.job_id,
      title: r.title,
      companyName: r.company_name,
      website: r.website || null,
      status: r.status,
      appliedAt: r.applied_at ? new Date(r.applied_at).toISOString() : null,
    },
  };
}

/** @returns {{ ok: true } | { ok: false, error: string }} */
export async function assertStudentMayApplyToInternship(studentId, jobId = null) {
  const lock = await getStudentInternshipSelectionLock(studentId);
  if (!lock.locked) return { ok: true };
  if (jobId && lock.selectedJobId === jobId) return { ok: true };
  return { ok: false, error: STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE };
}

/** Map DB row to student opportunity list item (shared shape). */
export function mapProgramOpportunityRow(r) {
  const jobType = r.job_type;
  const isAlumniJob = ALUMNI_JOB_TYPES.includes(String(jobType || ''));
  const { startDate, endDate } =
    jobType === 'internship' ? resolveInternshipDatesFromRow(r) : { startDate: null, endDate: null };
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    jobType,
    isAlumniJob,
    salaryMin: r.salary_min != null ? Number(r.salary_min) : null,
    salaryMax: r.salary_max != null ? Number(r.salary_max) : null,
    minCgpa: isAlumniJob ? null : normalizeEmployerMinCgpa(r.min_cgpa),
    maxBacklogs: isAlumniJob ? null : r.max_backlogs != null ? Number(r.max_backlogs) : null,
    eligibleBranches: isAlumniJob
      ? null
      : Array.isArray(r.eligible_branches)
        ? r.eligible_branches
        : null,
    batchYear: isAlumniJob ? null : r.batch_year != null ? Number(r.batch_year) : null,
    vacancies: r.vacancies,
    skillsRequired: r.skills_required || [],
    applicationDeadline: r.application_deadline,
    startDate,
    endDate,
    createdAt: r.created_at,
    employerId: r.employer_id,
    companyName: r.company_name,
    website: r.website,
    status: r.status || 'published',
    hasApplied: Boolean(r.application_id),
    applicationStatus: r.application_status || null,
  };
}
