/**
 * Normalize student apply context from program-opportunities / drives API payloads.
 */

import { normalizeEmployerMinCgpa } from '@/lib/employerJobDisplay';

/**
 * @param {Record<string, unknown> | null | undefined} data
 */
export function buildStudentApplyContext(data) {
  const cs = data?.currentStudent && typeof data.currentStudent === 'object' ? data.currentStudent : {};
  const cgpaRaw = cs.cgpa ?? data?.studentCgpa;
  const batchRaw = cs.batchYear ?? cs.batch_year;
  const backlogsRaw = cs.backlogsActive ?? cs.backlogs_active;
  return {
    cgpa: cgpaRaw != null && cgpaRaw !== '' && !Number.isNaN(Number(cgpaRaw)) ? Number(cgpaRaw) : null,
    branch: cs.branch || '',
    department: cs.department || '',
    batchYear:
      batchRaw != null && batchRaw !== '' && !Number.isNaN(Number(batchRaw)) ? Number(batchRaw) : null,
    backlogsActive:
      backlogsRaw != null && backlogsRaw !== '' && !Number.isNaN(Number(backlogsRaw))
        ? Number(backlogsRaw)
        : 0,
    hasResume: cs.hasResume ?? data?.hasResume ?? false,
    isPlacementLocked: cs.isPlacementLocked ?? data?.placementLocked ?? false,
    cvVerificationRequired: cs.cvVerificationRequired ?? data?.cvVerificationRequired ?? false,
    hasVerifiedCv: cs.hasVerifiedCv ?? data?.hasVerifiedCv ?? true,
    eligibilityGroupCode: cs.eligibilityGroupCode ?? cs.eligibility_group_code ?? null,
    eligibilityGroupName: cs.eligibilityGroupName ?? cs.eligibility_group_name ?? null,
  };
}

/** Map a program-opportunities or drive list row to getApplyBlockReason opportunity shape. */
export function programOpportunityFromRow(row) {
  if (!row) return { status: 'published' };
  const isAlumniJob = row.isAlumniJob || ['full_time', 'contract'].includes(String(row.jobType || row.job_type || ''));
  if (isAlumniJob) {
    return {
      minCgpa: null,
      maxBacklogs: null,
      eligibleBranches: null,
      batchYear: null,
      applicationDeadline: row.applicationDeadline ?? row.deadline ?? null,
      status: row.status || 'published',
    };
  }
  const minCgpa = normalizeEmployerMinCgpa(row.minCgpa ?? row.cgpa);
  const branches = row.eligibleBranches ?? (Array.isArray(row.branch) ? row.branch : null);
  return {
    minCgpa,
    maxBacklogs: row.maxBacklogs ?? null,
    eligibleBranches: branches,
    batchYear: row.batchYear ?? null,
    applicationDeadline: row.applicationDeadline ?? row.deadline ?? null,
    status: row.status || 'published',
  };
}
