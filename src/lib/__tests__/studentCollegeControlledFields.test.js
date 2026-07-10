const {
  applyCollegeControlledProfileFields,
  checkStudentCollegeFieldViolations,
  mergeStudentAuxProfilePreservingCollegeFields,
  resolveStudentBatchLabel,
  resolveStudentDegreeLabel,
} = require('../studentCollegeControlledFields');

describe('studentCollegeControlledFields', () => {
  const existing = {
    cgpa: 9,
    department: 'Computer Science',
    branch: 'CSE',
    batch_year: 2021,
    graduation_year: 2025,
    joining_academic_year: '2021',
    aux_profile: {
      batchLabel: '2021',
      semester: '6',
      degreePursued: 'B.Tech',
    },
  };

  it('resolves degree and batch labels', () => {
    expect(
      resolveStudentDegreeLabel({
        degreePursued: 'B.Tech',
        department: 'Computer Science',
        branch: 'CSE',
      }),
    ).toBe('B.Tech');
    expect(resolveStudentBatchLabel({ batch: '2021', batchYear: 2021 })).toBe('2021');
  });

  it('rejects CGPA changes from students', () => {
    const err = checkStudentCollegeFieldViolations({ cgpa: 8.5 }, existing);
    expect(err).toMatch(/CGPA/i);
  });

  it('rejects batch changes from students', () => {
    const err = checkStudentCollegeFieldViolations({ batchYear: 2022 }, existing);
    expect(err).toMatch(/Batch year/i);
  });

  it('allows saves without college-controlled fields', () => {
    expect(checkStudentCollegeFieldViolations({ bio: 'Hello' }, existing)).toBeNull();
  });

  it('forces college-controlled columns on update parts', () => {
    const parts = applyCollegeControlledProfileFields(
      { department: 'Hacked', branch: 'X', batch_year: 2000, graduation_year: 2099, cgpa: 0 },
      existing,
    );
    expect(parts.department).toBe('Computer Science');
    expect(parts.batch_year).toBe(2021);
    expect(parts.cgpa).toBe(9);
  });

  it('preserves college aux keys when merging', () => {
    const merged = mergeStudentAuxProfilePreservingCollegeFields(existing.aux_profile, {
      bio: 'new',
      batchLabel: '9999',
      semester: '1',
    });
    expect(merged.batchLabel).toBe('2021');
    expect(merged.semester).toBe('6');
    expect(merged.bio).toBe('new');
  });
});
