import { evaluateCgpaEligibility } from '@/lib/cgpaEligibility';
import { query } from '@/lib/db';
import {
  evaluateBacklogEligibility,
  evaluateBatchYearEligibility,
  evaluateBranchEligibility,
} from '@/lib/postingEligibilityCriteria';
import { programApplicationNotDeletedSql, jobPostingNotDeletedSql } from '@/lib/migrationReady';
import { STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE } from '@/lib/internshipPlacementMessages';
import {
  STUDENT_PLACEMENT_LOCKED_APPLY_MESSAGE,
  STUDENT_RESUME_REQUIRED_APPLY_MESSAGE,
} from '@/lib/studentApplyMessages';
import { getCollegeOfferRules } from '@/lib/offerPlacementRules';
import { isAuthoritativeResumeUrl } from '@/lib/studentResumeUrl';
import { AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import { resolveEffectiveStudentBatchYear } from '@/lib/studentBatch';

const PLACEMENT_STATUS_LOCK = new Set(['placed', 'opted_out', 'higher_studies']);

/**
 * Posting + profile gates for assessment CSV / online lists (same verifiable rules as apply, except deadline/status).
 *
 * @param {import('@/lib/getApplyBlockReason').OpportunityLike | null | undefined} opportunity
 * @param {import('@/lib/getApplyBlockReason').StudentLike | null | undefined} student
 * @param {{ internshipLocked?: boolean }} [options]
 * @returns {string | null}
 */
export function getAssessmentExportBlockReason(opportunity, student, options = {}) {
  if (student?.hasResume === false) {
    return STUDENT_RESUME_REQUIRED_APPLY_MESSAGE;
  }

  if (student?.isPlacementLocked) {
    return STUDENT_PLACEMENT_LOCKED_APPLY_MESSAGE;
  }

  if (options.internshipLocked) {
    return STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE;
  }

  const cgpaCheck = evaluateCgpaEligibility(opportunity?.minCgpa, student?.cgpa);
  if (!cgpaCheck.eligible && cgpaCheck.reason) return cgpaCheck.reason;

  const backlogCheck = evaluateBacklogEligibility(opportunity?.maxBacklogs, student?.backlogsActive);
  if (!backlogCheck.eligible && backlogCheck.reason) return backlogCheck.reason;

  const branchCheck = evaluateBranchEligibility(
    opportunity?.eligibleBranches,
    student?.branch,
    student?.department,
    {
      eligibilityGroupCode: student?.eligibilityGroupCode,
      eligibilityGroupName: student?.eligibilityGroupName,
    },
  );
  if (!branchCheck.eligible && branchCheck.reason) return branchCheck.reason;

  const batchCheck = evaluateBatchYearEligibility(opportunity?.batchYear, student?.batchYear);
  if (!batchCheck.eligible && batchCheck.reason) return batchCheck.reason;

  return null;
}

function opportunityFromJobRow(row) {
  if (!row) return {};
  return {
    minCgpa: row.min_cgpa != null ? Number(row.min_cgpa) : null,
    maxBacklogs: row.max_backlogs != null ? Number(row.max_backlogs) : null,
    eligibleBranches: Array.isArray(row.eligible_branches) ? row.eligible_branches : null,
    batchYear: row.batch_year != null ? Number(row.batch_year) : null,
  };
}

/**
 * Load min CGPA / branch / backlog / batch rules for the selected drive or job.
 *
 * @param {string} employerId
 * @param {'internship' | 'jobs' | 'drive' | 'projects'} kind
 * @param {{ driveId?: string | null, jobId?: string | null, tenantId: string }} context
 */
export async function loadAssessmentPostingOpportunity(employerId, kind, context) {
  const tenantId = String(context?.tenantId || '').trim();
  const driveId = context?.driveId || null;
  const jobId = context?.jobId || null;

  if (kind === 'drive' && driveId) {
    const res = await query(
      `SELECT d.id
       FROM placement_drives d
       WHERE d.id = $1::uuid AND d.employer_id = $2::uuid AND d.tenant_id = $3::uuid ${AND_DRIVE_NOT_DELETED}
       LIMIT 1`,
      [driveId, employerId, tenantId],
    );
    if (!res.rows.length) throw new Error('Drive not found for this employer');
    return {};
  }

  if (jobId) {
    const res = await query(
      `SELECT jp.min_cgpa, jp.max_backlogs, jp.eligible_branches, jp.batch_year
       FROM job_postings jp
       WHERE jp.id = $1::uuid AND jp.employer_id = $2::uuid ${AND_JP_NOT_DELETED}
       LIMIT 1`,
      [jobId, employerId],
    );
    if (!res.rows.length) throw new Error('Job posting not found for this employer');
    return opportunityFromJobRow(res.rows[0]);
  }

  return {};
}

function studentLikeFromCampusRow(row, { placementLockedIds, internshipLockedIds }) {
  const cgpaRaw = row.cgpa;
  const cgpa =
    cgpaRaw != null && cgpaRaw !== '' && !Number.isNaN(Number(cgpaRaw)) ? Number(cgpaRaw) : null;

  const hasResume =
    isAuthoritativeResumeUrl(row.resume_url) || Boolean(row.has_resume_document);

  return {
    cgpa,
    branch: row.branch || '',
    department: row.department || '',
    batchYear: resolveEffectiveStudentBatchYear({
      batch_year: row.batch_year,
      joining_academic_year: row.joining_academic_year,
    }),
    backlogsActive: Number(row.backlogs_active ?? 0),
    hasResume,
    isPlacementLocked: placementLockedIds.has(row.student_profile_id),
    _internshipLocked: internshipLockedIds.has(row.student_profile_id),
  };
}

async function loadPlacementLockedIds(tenantId, students) {
  const locked = new Set();
  const profileIds = students.map((s) => s.student_profile_id).filter(Boolean);
  if (!profileIds.length) return locked;

  for (const row of students) {
    const status = String(row.placement_status || '').trim().toLowerCase();
    if (PLACEMENT_STATUS_LOCK.has(status)) {
      locked.add(row.student_profile_id);
    }
  }

  const { maxOffers } = await getCollegeOfferRules(tenantId);
  if (!Number.isFinite(maxOffers) || maxOffers <= 0) return locked;

  const res = await query(
    `SELECT o.student_id AS student_profile_id, COUNT(*)::int AS n
     FROM offers o
     WHERE o.student_id = ANY($1::uuid[])
       AND LOWER(TRIM(o.status)) = 'accepted'
       AND COALESCE(o.is_deleted, false) = false
     GROUP BY o.student_id
     HAVING COUNT(*) >= $2::int`,
    [profileIds, maxOffers],
  );
  for (const r of res.rows) {
    locked.add(r.student_profile_id);
  }
  return locked;
}

async function loadInternshipLockedIds(profileIds, exceptJobId) {
  if (!profileIds.length) return new Set();

  const paNotDeleted = await programApplicationNotDeletedSql('pa');
  const jpNotDeleted = await jobPostingNotDeletedSql('jp');
  const params = [profileIds];
  let exceptClause = '';
  if (exceptJobId) {
    params.push(exceptJobId);
    exceptClause = `AND pa.job_id <> $${params.length}::uuid`;
  }

  const res = await query(
    `SELECT DISTINCT pa.student_id AS student_profile_id
     FROM program_applications pa
     JOIN job_postings jp ON jp.id = pa.job_id AND jp.job_type = 'internship'
     WHERE pa.student_id = ANY($1::uuid[])
       AND LOWER(TRIM(pa.status)) = 'selected'
       ${paNotDeleted}
       ${jpNotDeleted}
       ${exceptClause}`,
    params,
  );
  return new Set(res.rows.map((r) => r.student_profile_id));
}

/**
 * Keep only students who meet the posting eligibility rules for the selected target.
 *
 * @param {object[]} students — rows from listTenantStudentsForAssessment
 * @param {import('@/lib/getApplyBlockReason').OpportunityLike} opportunity
 * @param {string} tenantId
 * @param {'internship' | 'jobs' | 'drive' | 'projects'} kind
 * @param {{ jobId?: string | null }} [opts]
 */
export async function filterStudentsByAssessmentPostingEligibility(
  students,
  opportunity,
  tenantId,
  kind,
  { jobId = null } = {},
) {
  if (!students.length) {
    return { students: [], excludedCount: 0 };
  }

  const profileIds = students.map((s) => s.student_profile_id).filter(Boolean);
  const [placementLockedIds, internshipLockedIds] = await Promise.all([
    loadPlacementLockedIds(tenantId, students),
    kind === 'internship' ? loadInternshipLockedIds(profileIds, jobId) : Promise.resolve(new Set()),
  ]);

  const eligible = [];
  for (const row of students) {
    const student = studentLikeFromCampusRow(row, { placementLockedIds, internshipLockedIds });
    const block = getAssessmentExportBlockReason(opportunity, student, {
      internshipLocked: student._internshipLocked,
    });
    if (!block) eligible.push(row);
  }

  return {
    students: eligible,
    excludedCount: students.length - eligible.length,
  };
}
