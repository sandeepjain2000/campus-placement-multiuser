const { evaluateStudentProfileForBrowse } = require('@/lib/studentProfileCompletion');
const { buildStudentBrowseGateCopy } = require('@/lib/studentBrowseGate');

describe('student browse gate', () => {
  it('flags incomplete profile when required fields are missing', () => {
    const result = evaluateStudentProfileForBrowse({ roll_number: 'R1', cgpa: null });
    expect(result.profileComplete).toBe(false);
    expect(result.missingLabels).toContain('CGPA');
  });

  it('accepts profile when core academic fields are present', () => {
    const result = evaluateStudentProfileForBrowse({
      roll_number: 'R1',
      user_phone: '9876543210',
      branch: 'CSE',
      department: 'B.Tech',
      cgpa: 8.2,
    });
    expect(result.profileComplete).toBe(true);
    expect(result.missingLabels).toHaveLength(0);
  });

  it('builds combined title when profile and CV are both missing', () => {
    const copy = buildStudentBrowseGateCopy({ profileComplete: false, hasResume: false });
    expect(copy.browseGateTitle).toMatch(/profile and upload your CV/i);
  });

  it('builds CV-only title when profile is complete', () => {
    const copy = buildStudentBrowseGateCopy({ profileComplete: true, hasResume: false });
    expect(copy.browseGateTitle).toMatch(/Upload your CV/i);
  });
});
