const {
  isWithdrawnApplicationStatus,
  excludeWithdrawnStudents,
  WITHDRAWAL_IS_FINAL_STUDENT_MESSAGE,
} = require('@/lib/applicationWithdrawal');

describe('applicationWithdrawal', () => {
  it('detects withdrawn status case-insensitively', () => {
    expect(isWithdrawnApplicationStatus('withdrawn')).toBe(true);
    expect(isWithdrawnApplicationStatus('Withdrawn')).toBe(true);
    expect(isWithdrawnApplicationStatus('applied')).toBe(false);
  });

  it('excludes withdrawn profile ids from student lists', () => {
    const students = [
      { student_profile_id: 'a' },
      { student_profile_id: 'b' },
      { student_profile_id: 'c' },
    ];
    const filtered = excludeWithdrawnStudents(students, new Set(['b']));
    expect(filtered.map((s) => s.student_profile_id)).toEqual(['a', 'c']);
  });

  it('exposes final withdrawal message for apply API', () => {
    expect(WITHDRAWAL_IS_FINAL_STUDENT_MESSAGE).toMatch(/final/i);
    expect(WITHDRAWAL_IS_FINAL_STUDENT_MESSAGE).toMatch(/cannot apply again/i);
  });
});
