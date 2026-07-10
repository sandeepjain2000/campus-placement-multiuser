const { getDegreeTimelineWarning, MAX_TYPICAL_DEGREE_DURATION_YEARS } = require('../degreeTimeline');

describe('getDegreeTimelineWarning', () => {
  it('returns null for a typical 4-year programme', () => {
    expect(getDegreeTimelineWarning({ batchYear: 2022, graduationYear: 2026 })).toBeNull();
  });

  it('returns null at the typical duration threshold', () => {
    expect(
      getDegreeTimelineWarning({
        batchYear: 2021,
        graduationYear: 2021 + MAX_TYPICAL_DEGREE_DURATION_YEARS,
      }),
    ).toBeNull();
  });

  it('flags an unusually long programme span', () => {
    const warning = getDegreeTimelineWarning({ batchYear: 2021, graduationYear: 2029 });
    expect(warning).not.toBeNull();
    expect(warning.durationYears).toBe(8);
    expect(warning.message).toMatch(/2021/);
    expect(warning.message).toMatch(/2029/);
  });
});
