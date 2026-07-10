const {
  buildDefaultFailedBatchAdjustment,
  computeStudentSemesterNumber,
  isSemesterRolloverWindow,
  resolveRolloverBatchForStudent,
  resolveSemesterInYear,
  ROLLOVER_WINDOW_MONTHS,
} = require('../studentSemesterRollover');

describe('studentSemesterRollover', () => {
  describe('isSemesterRolloverWindow', () => {
    it('allows May and June', () => {
      expect(isSemesterRolloverWindow(new Date('2026-05-15'))).toBe(true);
      expect(isSemesterRolloverWindow(new Date('2026-06-01'))).toBe(true);
    });

    it('blocks other months', () => {
      expect(isSemesterRolloverWindow(new Date('2026-07-01'))).toBe(false);
      expect(isSemesterRolloverWindow(new Date('2026-04-30'))).toBe(false);
    });

    it('exports May–Jun month indices', () => {
      expect(ROLLOVER_WINDOW_MONTHS).toEqual([4, 5]);
    });
  });

  describe('resolveSemesterInYear', () => {
    const semesters = [
      { sequence_number: 1, period_start: '2025-07-01', period_end: '2025-12-31' },
      { sequence_number: 2, period_start: '2026-01-01', period_end: '2026-06-30' },
    ];

    it('uses tenant semester calendar', () => {
      expect(
        resolveSemesterInYear({ semesters, asOfDate: new Date('2026-05-20') }),
      ).toBe(2);
      expect(
        resolveSemesterInYear({ semesters, asOfDate: new Date('2025-10-01') }),
      ).toBe(1);
    });

    it('falls back to July-start two-semester split', () => {
      expect(resolveSemesterInYear({ asOfDate: new Date('2026-05-01'), startMonth: 7 })).toBe(2);
      expect(resolveSemesterInYear({ asOfDate: new Date('2026-08-01'), startMonth: 7 })).toBe(1);
    });
  });

  describe('computeStudentSemesterNumber', () => {
    it('computes final semester for batch 2023 in AY 2026-27 January', () => {
      expect(
        computeStudentSemesterNumber({
          batchYear: 2023,
          programDurationYears: 4,
          semestersPerYear: 2,
          academicYearStartYear: 2026,
          semesterInYear: 2,
        }),
      ).toBe(8);
    });

    it('computes semester 6 for batch 2023 in AY 2025-26 May', () => {
      expect(
        computeStudentSemesterNumber({
          batchYear: 2023,
          programDurationYears: 4,
          semestersPerYear: 2,
          academicYearStartYear: 2025,
          semesterInYear: 2,
        }),
      ).toBe(6);
    });

    it('caps at program maximum', () => {
      expect(
        computeStudentSemesterNumber({
          batchYear: 2018,
          programDurationYears: 4,
          semestersPerYear: 2,
          academicYearStartYear: 2026,
          semesterInYear: 2,
        }),
      ).toBe(8);
    });

    it('returns null without batch year', () => {
      expect(
        computeStudentSemesterNumber({
          batchYear: null,
          academicYearStartYear: 2026,
          semesterInYear: 1,
        }),
      ).toBeNull();
    });
  });

  describe('failed student batch adjustment', () => {
    it('defaults to batch+1 and graduation+1 for repeat year', () => {
      expect(buildDefaultFailedBatchAdjustment({ batchYear: 2023, graduationYear: 2027 })).toEqual({
        repeatYear: true,
        newBatchYear: 2024,
        newGraduationYear: 2028,
      });
    });

    it('keeps semester level when batch is shifted for a repeating student', () => {
      const row = { batch_year: 2023, graduation_year: 2027, joining_academic_year: '2023' };
      const resolved = resolveRolloverBatchForStudent(row, {
        repeatYear: true,
        newBatchYear: 2024,
        newGraduationYear: 2028,
      });
      expect(resolved.batchYear).toBe(2024);
      expect(resolved.graduationYear).toBe(2028);

      const withoutRepeat = computeStudentSemesterNumber({
        batchYear: 2023,
        programDurationYears: 4,
        semestersPerYear: 2,
        academicYearStartYear: 2026,
        semesterInYear: 2,
      });
      const withRepeat = computeStudentSemesterNumber({
        batchYear: resolved.batchYear,
        programDurationYears: 4,
        semestersPerYear: 2,
        academicYearStartYear: 2026,
        semesterInYear: 2,
      });
      expect(withoutRepeat).toBe(8);
      expect(withRepeat).toBe(6);
    });
  });
});
