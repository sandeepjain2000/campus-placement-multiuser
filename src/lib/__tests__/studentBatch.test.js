const { resolveEffectiveStudentBatchYear } = require('@/lib/studentBatch');
const { evaluateBatchYearEligibility } = require('@/lib/postingEligibilityCriteria');
const { buildPostingEligibilityChecks } = require('@/lib/buildPostingEligibilityChecks');
const { getApplyBlockReason } = require('@/lib/getApplyBlockReason');

/** arjun.verma@iitm.edu — profile shows batch 2026 via cohort label; stale batch_year blocked apply. */
const ARJUN_BATCH_MISMATCH = {
  batch_year: 2025,
  joining_academic_year: '2026',
  batchLabel: '2026',
  joiningAcademicYear: '2026',
};

describe('resolveEffectiveStudentBatchYear', () => {
  it('prefers joining academic year over stale batch_year (Arjun Verma scenario)', () => {
    expect(resolveEffectiveStudentBatchYear(ARJUN_BATCH_MISMATCH)).toBe(2026);
  });

  it('falls back to batch_year when no cohort label exists', () => {
    expect(resolveEffectiveStudentBatchYear({ batch_year: 2024 })).toBe(2024);
  });

  it('allows internship apply when effective batch matches posting requirement', () => {
    const batchYear = resolveEffectiveStudentBatchYear(ARJUN_BATCH_MISMATCH);
    const opportunity = { batchYear: 2026, status: 'published' };
    const student = {
      batchYear,
      cgpa: 8.72,
      backlogsActive: 0,
      hasResume: true,
      isPlacementLocked: false,
    };

    expect(evaluateBatchYearEligibility(opportunity.batchYear, student.batchYear).eligible).toBe(true);
    expect(getApplyBlockReason(opportunity, student)).toBeNull();

    const checks = buildPostingEligibilityChecks(opportunity, student, { audience: 'student' });
    const batchRow = checks.find((r) => r.id === 'batch');
    expect(batchRow?.met).toBe(true);
    expect(batchRow?.detail).toBe('Your batch: 2026');
  });

  it('would block when only stale batch_year is used', () => {
    expect(evaluateBatchYearEligibility(2026, 2025).eligible).toBe(false);
  });
});
