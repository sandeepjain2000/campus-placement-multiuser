import { evaluateCgpaEligibility } from '@/lib/cgpaEligibility';
import {
  evaluateApplicationDeadlineEligibility,
  evaluateBacklogEligibility,
  evaluateBatchYearEligibility,
} from '@/lib/postingEligibilityCriteria';
import { formatStatus } from '@/lib/utils';

/**
 * @typedef {{
 *   id: string;
 *   label: string;
 *   requirement: string;
 *   met: boolean | null;
 *   detail?: string;
 * }} EligibilityCheckRow
 */

/**
 * Build readable eligibility rows for postings (student + college views).
 *
 * @param {import('@/lib/getApplyBlockReason').OpportunityLike | null | undefined} opportunity
 * @param {import('@/lib/getApplyBlockReason').StudentLike | null | undefined} student
 * @param {{ openStatuses?: string[]; audience?: 'student' | 'college' }} [options]
 * @returns {EligibilityCheckRow[]}
 */
export function buildPostingEligibilityChecks(opportunity, student, options = {}) {
  const audience = options.audience || (student ? 'student' : 'college');
  const openStatuses = options.openStatuses || ['published'];
  const status = String(opportunity?.status || 'published').toLowerCase();
  const isOpen = openStatuses.includes(status);

  const rows = [
    {
      id: 'status',
      label: 'Posting status',
      requirement: openStatuses.map((s) => formatStatus(s)).join(' or '),
      met: audience === 'college' ? null : isOpen,
      detail: audience === 'college' ? `Current: ${formatStatus(status)}` : isOpen ? 'Open for applications' : 'Not accepting applications',
    },
  ];

  if (opportunity?.maxBacklogs != null) {
    const max = Number(opportunity.maxBacklogs);
    if (audience === 'student' && student) {
      const bl = evaluateBacklogEligibility(max, student.backlogsActive);
      rows.push({
        id: 'backlogs',
        label: 'Active backlogs',
        requirement: `At most ${max}`,
        met: bl.eligible,
        detail:
          student.backlogsActive != null
            ? `Your profile: ${student.backlogsActive}`
            : 'Add backlog count on your profile',
      });
    } else {
      rows.push({
        id: 'backlogs',
        label: 'Active backlogs',
        requirement: `At most ${max}`,
        met: null,
        detail: 'Students must be within this limit on their profile',
      });
    }
  }

  const branches = opportunity?.eligibleBranches;
  if (Array.isArray(branches) && branches.length > 0 && !branches.some((b) => /^all$/i.test(String(b).trim()))) {
    rows.push({
      id: 'branch',
      label: 'Eligible branches',
      requirement: branches.join(', '),
      met: null,
      detail:
        audience === 'student' && student && (student.branch || student.department)
          ? `Your branch: ${student.branch || student.department}`
          : audience === 'college'
            ? 'Informational only (branch matching not enforced yet)'
            : undefined,
    });
  }

  if (opportunity?.batchYear != null) {
    const req = Number(opportunity.batchYear);
    if (audience === 'student' && student) {
      const by = evaluateBatchYearEligibility(req, student.batchYear);
      rows.push({
        id: 'batch',
        label: 'Batch year',
        requirement: String(req),
        met: by.eligible,
        detail:
          student.batchYear != null ? `Your batch: ${student.batchYear}` : 'Add batch year on your profile',
      });
    } else {
      rows.push({
        id: 'batch',
        label: 'Batch year',
        requirement: String(req),
        met: null,
      });
    }
  }

  if (opportunity?.applicationDeadline) {
    const dl = evaluateApplicationDeadlineEligibility(opportunity.applicationDeadline);
    if (audience === 'student' && student) {
      rows.push({
        id: 'deadline',
        label: 'Application deadline',
        requirement: String(opportunity.applicationDeadline).slice(0, 10),
        met: dl.eligible,
        detail: dl.eligible ? 'Still open' : 'Deadline has passed',
      });
    } else {
      rows.push({
        id: 'deadline',
        label: 'Application deadline',
        requirement: String(opportunity.applicationDeadline).slice(0, 10),
        met: null,
      });
    }
  }

  if (opportunity?.minCgpa != null) {
    const req = Number(opportunity.minCgpa);
    if (audience === 'student' && student) {
      const cgpa = evaluateCgpaEligibility(opportunity.minCgpa, student.cgpa);
      rows.push({
        id: 'cgpa',
        label: 'Minimum CGPA',
        requirement: String(req),
        met: cgpa.eligible,
        detail:
          student.cgpa != null && !Number.isNaN(Number(student.cgpa))
            ? `Your CGPA: ${Number(student.cgpa)}`
            : 'Add CGPA on your profile',
      });
    } else {
      rows.push({
        id: 'cgpa',
        label: 'Minimum CGPA',
        requirement: String(req),
        met: null,
        detail: 'Students must meet this on their profile',
      });
    }
  }

  if (audience === 'student' && student) {
    rows.push({
      id: 'resume',
      label: 'Primary CV / résumé',
      requirement: 'Uploaded on profile',
      met: Boolean(student.hasResume),
      detail: student.hasResume ? 'CV on file' : 'Upload under Profile → Résumé / CV',
    });
    rows.push({
      id: 'placement',
      label: 'Placement status',
      requirement: 'Eligible to apply (not placed / locked)',
      met: !student.isPlacementLocked,
      detail: student.isPlacementLocked ? 'Locked — view My Offers' : 'You may apply',
    });
  }

  return rows;
}
