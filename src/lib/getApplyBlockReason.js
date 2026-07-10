import { evaluateCgpaEligibility } from '@/lib/cgpaEligibility';
import {
  evaluateApplicationDeadlineEligibility,
  evaluateBacklogEligibility,
  evaluateBatchYearEligibility,
  evaluateBranchEligibility,
} from '@/lib/postingEligibilityCriteria';
import { STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE } from '@/lib/internshipPlacementMessages';
import {
  STUDENT_PLACEMENT_LOCKED_APPLY_MESSAGE,
  STUDENT_RESUME_REQUIRED_APPLY_MESSAGE,
  STUDENT_CV_VERIFICATION_REQUIRED_APPLY_MESSAGE,
} from '@/lib/studentApplyMessages';

const DEFAULT_OPEN_STATUSES = ['published'];

/**
 * @typedef {{
 *   minCgpa?: number | null;
 *   maxBacklogs?: number | null;
 *   eligibleBranches?: string[] | null;
 *   batchYear?: number | null;
 *   applicationDeadline?: string | Date | null;
 *   status?: string | null;
 * }} OpportunityLike
 * @typedef {{
 *   cgpa?: number | null;
 *   branch?: string | null;
 *   department?: string | null;
 *   batchYear?: number | null;
 *   backlogsActive?: number | null;
 *   hasResume?: boolean;
 *   isPlacementLocked?: boolean;
 *   hasVerifiedCv?: boolean;
 *   eligibilityGroupCode?: string | null;
 *   eligibilityGroupName?: string | null;
 * }} StudentLike
 * @typedef {{
 *   openStatuses?: string[];
 *   internshipLocked?: boolean;
 *   skipCampusPlacementCriteria?: boolean;
 *   requireCvVerification?: boolean;
 * }} ApplyBlockOptions
 */

/**
 * Returns a user-facing reason when apply should be blocked, or null when allowed.
 * Priority: resume → placement lock → internship lock → CGPA → backlogs → branch → batch → deadline → status.
 *
 * @param {OpportunityLike | null | undefined} opportunity
 * @param {StudentLike | null | undefined} student
 * @param {ApplyBlockOptions} [options]
 * @returns {string | null}
 */
export function getApplyBlockReason(opportunity, student, options = {}) {
  const openStatuses = options.openStatuses || DEFAULT_OPEN_STATUSES;
  const status = String(opportunity?.status || 'published').toLowerCase();
  const skipCampus = Boolean(options.skipCampusPlacementCriteria);

  if (student?.hasResume === false) {
    return STUDENT_RESUME_REQUIRED_APPLY_MESSAGE;
  }

  if (options.requireCvVerification && student?.hasVerifiedCv === false) {
    return STUDENT_CV_VERIFICATION_REQUIRED_APPLY_MESSAGE;
  }

  if (student?.isPlacementLocked && !skipCampus) {
    return STUDENT_PLACEMENT_LOCKED_APPLY_MESSAGE;
  }

  if (options.internshipLocked) {
    return STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE;
  }

  if (!skipCampus) {
    const cgpaCheck = evaluateCgpaEligibility(opportunity?.minCgpa, student?.cgpa);
    if (!cgpaCheck.eligible && cgpaCheck.reason) {
      return cgpaCheck.reason;
    }

    const backlogCheck = evaluateBacklogEligibility(opportunity?.maxBacklogs, student?.backlogsActive);
    if (!backlogCheck.eligible && backlogCheck.reason) {
      return backlogCheck.reason;
    }

    const branchCheck = evaluateBranchEligibility(
      opportunity?.eligibleBranches,
      student?.branch,
      student?.department,
      {
        eligibilityGroupCode: student?.eligibilityGroupCode,
        eligibilityGroupName: student?.eligibilityGroupName,
      },
    );
    if (!branchCheck.eligible && branchCheck.reason) {
      return branchCheck.reason;
    }

    const batchCheck = evaluateBatchYearEligibility(opportunity?.batchYear, student?.batchYear);
    if (!batchCheck.eligible && batchCheck.reason) {
      return batchCheck.reason;
    }
  }

  const deadlineCheck = evaluateApplicationDeadlineEligibility(opportunity?.applicationDeadline);
  if (!deadlineCheck.eligible && deadlineCheck.reason) {
    return deadlineCheck.reason;
  }

  if (!openStatuses.includes(status)) {
    return 'This opening is not accepting applications.';
  }

  return null;
}

/** Build opportunity + student shapes from a joined job/student DB row. */
export function postingEligibilityFromJobRow(row) {
  if (!row) return { opportunity: {}, student: {} };
  return {
    opportunity: {
      minCgpa: row.min_cgpa != null ? Number(row.min_cgpa) : null,
      maxBacklogs: row.max_backlogs != null ? Number(row.max_backlogs) : null,
      eligibleBranches: Array.isArray(row.eligible_branches) ? row.eligible_branches : null,
      batchYear: row.batch_year != null ? Number(row.batch_year) : null,
      applicationDeadline: row.application_deadline || null,
      status: row.status || 'published',
    },
    student: {
      cgpa:
        row.student_cgpa != null && row.student_cgpa !== '' && !Number.isNaN(Number(row.student_cgpa))
          ? Number(row.student_cgpa)
          : null,
      branch: row.student_branch || row.branch || '',
      department: row.student_department || row.department || '',
      batchYear:
        row.student_batch_year != null && row.student_batch_year !== ''
          ? Number(row.student_batch_year)
          : null,
      backlogsActive: Number(row.student_backlogs_active ?? row.backlogs_active ?? 0),
    },
  };
}

/**
 * @param {OpportunityLike | null | undefined} opportunity
 * @param {StudentLike | null | undefined} student
 * @param {ApplyBlockOptions} [options]
 */
export function canStudentApplyToOpportunity(opportunity, student, options = {}) {
  return getApplyBlockReason(opportunity, student, options) == null;
}

/**
 * Single block reason for UI: global gate (no CV / placement lock) then per-posting rules.
 * @param {OpportunityLike | null | undefined} opportunity
 * @param {StudentLike | null | undefined} student
 * @param {ApplyBlockOptions & { globalBlockedReason?: string | null }} [options]
 * @returns {string | null}
 */
export function resolveApplyBlockReason(opportunity, student, options = {}) {
  const { globalBlockedReason, ...applyOptions } = options;
  if (globalBlockedReason) return globalBlockedReason;
  return getApplyBlockReason(opportunity, student, applyOptions);
}

/** Page-level apply gate from program-opportunities / drives API. */
export function globalApplyBlockedReason(canApply, applyBlockedReason) {
  if (canApply !== false) return null;
  const msg = typeof applyBlockedReason === 'string' ? applyBlockedReason.trim() : '';
  return msg || null;
}
