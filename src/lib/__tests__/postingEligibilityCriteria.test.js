const {
  evaluateBacklogEligibility,
  evaluateBatchYearEligibility,
  evaluateBranchEligibility,
  evaluateApplicationDeadlineEligibility,
} = require('../postingEligibilityCriteria');

describe('postingEligibilityCriteria', () => {
  it('blocks when backlogs exceed max', () => {
    expect(evaluateBacklogEligibility(2, 3).eligible).toBe(false);
  });

  it('allows when backlogs within max', () => {
    expect(evaluateBacklogEligibility(2, 1).eligible).toBe(true);
  });

  it('blocks when batch year mismatches', () => {
    expect(evaluateBatchYearEligibility(2025, 2024).eligible).toBe(false);
  });

  it('does not block on branch text while matching is disabled', () => {
    expect(evaluateBranchEligibility(['CSE'], 'ECE', '').eligible).toBe(true);
    expect(evaluateBranchEligibility(['Computer Science & Engineering'], 'CSE', '').eligible).toBe(true);
  });

  it('matches eligibility groups when enabled', () => {
    expect(
      evaluateBranchEligibility(['Computer Science'], 'ECE', 'Electronics', {
        eligibilityGroupCode: 'computer_science',
        eligibilityGroupName: 'Computer Science',
      }).eligible,
    ).toBe(true);
    expect(
      evaluateBranchEligibility(['Electronics'], 'CSE', 'Computer Science', {
        eligibilityGroupCode: 'computer_science',
        eligibilityGroupName: 'Computer Science',
      }).eligible,
    ).toBe(false);
  });

  it('blocks when student eligibility group does not match posting groups', () => {
    const result = evaluateBranchEligibility(['Mechanical'], 'CSE', 'Computer Science', {
      eligibilityGroupCode: 'computer_science',
      eligibilityGroupName: 'Computer Science',
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/Mechanical/);
  });

  it('blocks after application deadline', () => {
    const past = new Date();
    past.setDate(past.getDate() - 2);
    expect(evaluateApplicationDeadlineEligibility(past.toISOString()).eligible).toBe(false);
  });
});
