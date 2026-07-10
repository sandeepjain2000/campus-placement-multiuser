const { getApplyBlockReason } = require('../getApplyBlockReason');
const {
  STUDENT_RESUME_REQUIRED_APPLY_MESSAGE,
  STUDENT_PLACEMENT_LOCKED_APPLY_MESSAGE,
} = require('../studentApplyEligibility');

describe('getApplyBlockReason', () => {
  const eligibleStudent = {
    cgpa: 8.5,
    branch: 'CSE',
    department: 'Computer Science',
    batchYear: 2025,
    backlogsActive: 0,
    hasResume: true,
    isPlacementLocked: false,
  };

  const internship = { minCgpa: 7, status: 'published' };

  it('returns null when all criteria pass', () => {
    expect(getApplyBlockReason(internship, eligibleStudent)).toBeNull();
  });

  it('blocks when CGPA is below minimum (priority after resume and placement)', () => {
    const reason = getApplyBlockReason(internship, { ...eligibleStudent, cgpa: 6.2 });
    expect(reason).toMatch(/below the minimum required/i);
    expect(reason).toContain('6.2');
    expect(reason).toContain('7');
  });

  it('blocks when resume is missing (first priority)', () => {
    expect(getApplyBlockReason(internship, { ...eligibleStudent, hasResume: false })).toBe(
      STUDENT_RESUME_REQUIRED_APPLY_MESSAGE,
    );
  });

  it('blocks when placement is locked (second priority)', () => {
    expect(
      getApplyBlockReason(internship, { ...eligibleStudent, isPlacementLocked: true }),
    ).toBe(STUDENT_PLACEMENT_LOCKED_APPLY_MESSAGE);
  });

  it('blocks when posting is not published', () => {
    expect(getApplyBlockReason({ minCgpa: 7, status: 'draft' }, eligibleStudent)).toMatch(
      /not accepting applications/i,
    );
  });

  it('allows approved/scheduled drives when openStatuses configured', () => {
    const drive = { minCgpa: 7, status: 'approved' };
    expect(
      getApplyBlockReason(drive, eligibleStudent, { openStatuses: ['approved', 'scheduled'] }),
    ).toBeNull();
  });

  it('blocks when backlogs exceed posting limit', () => {
    const reason = getApplyBlockReason(
      { minCgpa: 7, maxBacklogs: 1, status: 'published' },
      { ...eligibleStudent, backlogsActive: 3 },
    );
    expect(reason).toMatch(/backlog/i);
  });

  it('does not block when branch text differs from posting list (matching disabled)', () => {
    const reason = getApplyBlockReason(
      { eligibleBranches: ['ECE'], status: 'published' },
      { ...eligibleStudent, branch: 'CSE' },
    );
    expect(reason).toBeNull();
  });

  it('blocks when batch year mismatches', () => {
    const reason = getApplyBlockReason(
      { batchYear: 2024, status: 'published' },
      { ...eligibleStudent, batchYear: 2025 },
    );
    expect(reason).toMatch(/batch/i);
  });

  it('skips campus CGPA/batch rules for alumni jobs when configured', () => {
    expect(
      getApplyBlockReason(
        { minCgpa: 9.5, batchYear: 2024, maxBacklogs: 0, status: 'published' },
        { ...eligibleStudent, cgpa: 6, batchYear: 2018, backlogsActive: 2 },
        { skipCampusPlacementCriteria: true },
      ),
    ).toBeNull();
  });
});
