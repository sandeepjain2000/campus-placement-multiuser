const { getRoleDisplayName } = require('@/lib/utils');

describe('getRoleDisplayName', () => {
  it('labels alumni students as Alumni', () => {
    expect(getRoleDisplayName('student', { isAlumni: true })).toBe('Alumni');
    expect(getRoleDisplayName('student', true)).toBe('Alumni');
  });

  it('labels non-alumni students as Student', () => {
    expect(getRoleDisplayName('student')).toBe('Student');
    expect(getRoleDisplayName('student', { isAlumni: false })).toBe('Student');
  });

  it('keeps other role labels unchanged', () => {
    expect(getRoleDisplayName('employer')).toBe('Employer');
    expect(getRoleDisplayName('super_admin')).toBe('Super Admin');
  });
});
