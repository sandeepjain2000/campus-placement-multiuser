const { getAssessmentExportBlockReason } = require('../assessmentExportEligibility');
const {
  STUDENT_RESUME_REQUIRED_APPLY_MESSAGE,
  STUDENT_PLACEMENT_LOCKED_APPLY_MESSAGE,
} = require('../studentApplyEligibility');

describe('getAssessmentExportBlockReason', () => {
  const posting = { minCgpa: 7, maxBacklogs: 0, eligibleBranches: ['CSE'], batchYear: 2025 };
  const eligible = {
    cgpa: 8,
    branch: 'CSE',
    department: 'Computer Science',
    batchYear: 2025,
    backlogsActive: 0,
    hasResume: true,
    isPlacementLocked: false,
  };

  it('returns null when student meets posting rules', () => {
    expect(getAssessmentExportBlockReason(posting, eligible)).toBeNull();
  });

  it('blocks missing CV', () => {
    expect(getAssessmentExportBlockReason(posting, { ...eligible, hasResume: false })).toBe(
      STUDENT_RESUME_REQUIRED_APPLY_MESSAGE,
    );
  });

  it('blocks placement lock', () => {
    expect(getAssessmentExportBlockReason(posting, { ...eligible, isPlacementLocked: true })).toBe(
      STUDENT_PLACEMENT_LOCKED_APPLY_MESSAGE,
    );
  });

  it('blocks low CGPA', () => {
    expect(getAssessmentExportBlockReason(posting, { ...eligible, cgpa: 6 })).toMatch(/below the minimum/i);
  });
});
