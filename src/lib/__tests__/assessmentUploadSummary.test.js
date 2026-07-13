const {
  isRejectedHiringResult,
  summarizeAssessmentUploadRows,
  recalculateAssessmentUploadSummary,
} = require('@/lib/assessmentUploadSummary');

describe('assessmentUploadSummary', () => {
  it('treats Reject and Decline as rejected hiring outcomes', () => {
    expect(isRejectedHiringResult('Reject')).toBe(true);
    expect(isRejectedHiringResult('reject')).toBe(true);
    expect(isRejectedHiringResult('Decline')).toBe(true);
    expect(isRejectedHiringResult('Select')).toBe(false);
    expect(isRejectedHiringResult('Shortlist')).toBe(false);
    expect(isRejectedHiringResult('Applied')).toBe(false);
  });

  it('summarizes rows by current hiring_result', () => {
    const summary = summarizeAssessmentUploadRows([
      { hiring_result: 'Select' },
      { hiring_result: 'Shortlist' },
      { hiring_result: 'Reject' },
    ]);
    expect(summary).toEqual({
      total_rows: 3,
      accepted_rows: 2,
      rejected_rows: 1,
    });
  });

  it('recalculates and persists upload summary counts', async () => {
    const queries = [];
    const client = {
      query: jest.fn(async (sql, params) => {
        queries.push({ sql: String(sql), params });
        if (String(sql).includes('SELECT hiring_result')) {
          return {
            rows: [
              { hiring_result: 'Select' },
              { hiring_result: 'Reject' },
              { hiring_result: 'Applied' },
            ],
          };
        }
        return { rows: [] };
      }),
    };

    const summary = await recalculateAssessmentUploadSummary(client, 'upload-uuid');
    expect(summary).toEqual({
      total_rows: 3,
      accepted_rows: 2,
      rejected_rows: 1,
    });
    expect(queries.some((q) => q.sql.includes('UPDATE employer_assessment_uploads'))).toBe(true);
    const update = queries.find((q) => q.sql.includes('UPDATE employer_assessment_uploads'));
    expect(update?.params).toEqual([3, 2, 1, 'upload-uuid']);
  });
});
