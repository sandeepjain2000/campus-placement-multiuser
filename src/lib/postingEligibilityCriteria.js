/**
 * Per-posting eligibility rules the system can verify from profile + posting fields.
 */

/** Free-text branch/specialisation matching is off until taxonomy group matching is used. */
export const BRANCH_ELIGIBILITY_MATCHING_ENABLED = false;

/** Match recruiter eligibility groups (Computer Science, Electronics, …) to student taxonomy. */
export const ELIGIBILITY_GROUP_MATCHING_ENABLED = true;

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isOpenToAllBranches(label) {
  const t = normalizeToken(label);
  return t === 'all' || t === 'all branches' || t === 'all eligible branches' || t === 'any';
}

/**
 * @param {string[] | null | undefined} eligibleBranches
 * @param {string | null | undefined} studentBranch
 * @param {string | null | undefined} studentDepartment
 * @param {{ eligibilityGroupCode?: string | null, eligibilityGroupName?: string | null }} [options]
 */
export function evaluateBranchEligibility(eligibleBranches, studentBranch, studentDepartment, options = {}) {
  const list = Array.isArray(eligibleBranches)
    ? eligibleBranches.map((b) => String(b || '').trim()).filter(Boolean)
    : [];
  if (!list.length || list.some(isOpenToAllBranches)) {
    return { eligible: true };
  }

  if (ELIGIBILITY_GROUP_MATCHING_ENABLED) {
    const groupCode = normalizeToken(options.eligibilityGroupCode);
    const groupName = normalizeToken(options.eligibilityGroupName);
    if (groupCode || groupName) {
      const allowed = list.map(normalizeToken);
      const groupMatch = allowed.some((a) => {
        if (isOpenToAllBranches(a)) return true;
        if (groupCode && (a === groupCode || a.replace(/\s+/g, '_') === groupCode.replace(/\s+/g, '_'))) return true;
        if (groupName && (a === groupName || groupName.includes(a) || a.includes(groupName))) return true;
        return false;
      });
      if (groupMatch) return { eligible: true };
      return {
        eligible: false,
        reason: `This opening is limited to: ${list.join(', ')}.`,
      };
    }
  }

  if (!BRANCH_ELIGIBILITY_MATCHING_ENABLED) {
    return { eligible: true };
  }

  const branch = normalizeToken(studentBranch);
  const dept = normalizeToken(studentDepartment);
  if (!branch && !dept) {
    return {
      eligible: false,
      reason: 'Add your branch or department on your profile to apply to this opening.',
    };
  }

  const allowed = list.map(normalizeToken);
  const matches = allowed.some((a) => {
    if (isOpenToAllBranches(a)) return true;
    return (
      (branch && (branch === a || branch.includes(a) || a.includes(branch))) ||
      (dept && (dept === a || dept.includes(a) || a.includes(dept)))
    );
  });

  if (!matches) {
    return {
      eligible: false,
      reason: `This opening is limited to: ${list.join(', ')}.`,
    };
  }
  return { eligible: true };
}

/**
 * @param {number | null | undefined} maxBacklogs
 * @param {number | null | undefined} backlogsActive
 */
export function evaluateBacklogEligibility(maxBacklogs, backlogsActive) {
  if (maxBacklogs == null || maxBacklogs === '') {
    return { eligible: true };
  }
  const max = Number(maxBacklogs);
  if (Number.isNaN(max)) return { eligible: true };

  const active = Number(backlogsActive ?? 0);
  if (Number.isNaN(active)) {
    return {
      eligible: false,
      reason: 'Add your active backlog count on your profile to apply.',
    };
  }

  if (active > max) {
    return {
      eligible: false,
      reason: `This opening allows at most ${max} active backlog${max === 1 ? '' : 's'}; your profile shows ${active}.`,
    };
  }
  return { eligible: true };
}

/**
 * @param {number | string | null | undefined} requiredBatchYear
 * @param {number | string | null | undefined} studentBatchYear
 */
export function evaluateBatchYearEligibility(requiredBatchYear, studentBatchYear) {
  if (requiredBatchYear == null || requiredBatchYear === '') {
    return { eligible: true };
  }
  const req = Number(requiredBatchYear);
  if (Number.isNaN(req)) return { eligible: true };

  const mine = Number(studentBatchYear);
  if (Number.isNaN(mine)) {
    return {
      eligible: false,
      reason: 'Add your batch year on your profile to apply to this opening.',
    };
  }
  if (mine !== req) {
    return {
      eligible: false,
      reason: `This opening is for batch ${req}; your profile shows batch ${mine}.`,
    };
  }
  return { eligible: true };
}

/**
 * @param {string | Date | null | undefined} deadline
 */
export function evaluateApplicationDeadlineEligibility(deadline) {
  if (!deadline) return { eligible: true };
  const d = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(d.getTime())) return { eligible: true };

  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  if (Date.now() > end.getTime()) {
    return {
      eligible: false,
      reason: 'The application deadline for this opening has passed.',
    };
  }
  return { eligible: true };
}
