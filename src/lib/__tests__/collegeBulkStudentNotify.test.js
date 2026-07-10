const {
  normalizeBatchYear,
  normalizeBranchSelection,
  buildDriveReminderDefaults,
} = require('@/lib/collegeBulkStudentNotify');

describe('collegeBulkStudentNotify', () => {
  it('normalizes batch year', () => {
    expect(normalizeBatchYear(2026)).toBe(2026);
    expect(normalizeBatchYear('2025')).toBe(2025);
    expect(normalizeBatchYear('abc')).toBeNull();
  });

  it('normalizes branch selection', () => {
    expect(normalizeBranchSelection(['CSE', 'ECE'], false)).toEqual({
      allBranches: false,
      branches: ['CSE', 'ECE'],
    });
    expect(normalizeBranchSelection(['CSE'], true)).toEqual({
      allBranches: true,
      branches: [],
    });
    expect(normalizeBranchSelection([], false)).toEqual({
      allBranches: false,
      branches: [],
    });
  });

  it('builds drive reminder defaults', () => {
    const d = buildDriveReminderDefaults({
      company: 'TechCorp',
      title: 'SDE Drive',
      driveDate: '2026-07-15',
    });
    expect(d.alertTitle).toContain('TechCorp');
    expect(d.alertMessage).toContain('SDE Drive');
    expect(d.link).toBe('/dashboard/student/drives');
  });
});
