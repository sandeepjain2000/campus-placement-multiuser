const mockQuery = jest.fn();

jest.mock('@/lib/db', () => ({
  query: (...args) => mockQuery(...args),
  transaction: (fn) => fn({ query: mockQuery }),
}));

// Mock the assertAssessmentContextEditable, ensureUpload, etc.
jest.mock('@/lib/assessmentContext', () => ({
  assertAssessmentContextEditable: jest.fn(),
  getOrCreateAssessmentContext: jest.fn(),
}));

jest.mock('@/lib/campusFcfsSelection', () => ({
  assertEmployerMayConfirmStudent: jest.fn().mockResolvedValue({ ok: true }),
  EMPLOYER_FCFS_BLOCKED_MESSAGE: 'fcfs blocked',
  fcfsTrackFromAssessmentKind: jest.fn().mockReturnValue('some-track'),
  isFcfsHiringSelect: jest.fn().mockReturnValue(false),
  listCampusFcfsUnavailableForEmployer: jest.fn().mockResolvedValue([]),
}));

import { saveAssessmentUpdateOnlineRows } from '../assessmentUpdateOnline';

describe('saveAssessmentUpdateOnlineRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly queries and links application_id and updates status to selected', async () => {
    const studentProfileId = 'student-uuid';
    const tenantId = 'tenant-uuid';
    const jobId = 'job-uuid';
    const employerId = 'employer-uuid';
    const userId = 'user-uuid';
    const applicationId = 'application-uuid';
    const uploadId = 'upload-uuid';

    // Mock implementation checking SQL and parameters
    mockQuery.mockImplementation(async (sql, params) => {
      const lowerSql = String(sql).toLowerCase();
      const hasWithdrawnParam = params && params.includes('withdrawn');
      
      if (lowerSql.includes('from student_profiles')) {
        return {
          rows: [
            {
              student_profile_id: studentProfileId,
              college_roll_no: 'ROLL123',
              tenant_id: tenantId,
              short_code: 'CAMP',
            },
          ],
        };
      }

      if (lowerSql.includes('select id from employer_assessment_uploads') || lowerSql.includes('insert into employer_assessment_uploads')) {
        return {
          rows: [{ id: uploadId }],
        };
      }

      if (hasWithdrawnParam) {
        return { rows: [], rowCount: 0 };
      }

      // mock findApplicationForStudent return
      if (lowerSql.includes('from program_applications') && !hasWithdrawnParam) {
        return {
          rows: [{ id: applicationId }],
          rowCount: 1,
        };
      }

      // mock findAssessmentRowInContext (existing rows query)
      if (lowerSql.includes('select ear.id') && lowerSql.includes('from employer_assessment_rows')) {
        return { rows: [], rowCount: 0 };
      }

      // mock upsertAssessmentRowInContext calls
      return { rows: [], rowCount: 0 };
    });

    const result = await saveAssessmentUpdateOnlineRows(
      employerId,
      userId,
      'internship',
      { tenantId, jobId },
      [
        {
          student_profile_id: studentProfileId,
          hiring_result: 'Select',
          remarks: 'Good performance',
          candidate_name: 'John Doe',
        },
      ],
    );

    expect(result.errors).toEqual([]);
    expect(result.saved).toBe(1);

    // Verify mockQuery was called for program_applications lookup
    const progAppQueryCalls = mockQuery.mock.calls.filter(([sql, params]) =>
      sql.toLowerCase().includes('program_applications') &&
      !(params && params.includes('withdrawn'))
    );
    expect(progAppQueryCalls.length).toBeGreaterThan(0);

    // Verify mockQuery was called for upserting assessment row with resolved application_id
    const upsertCalls = mockQuery.mock.calls.filter(([sql]) =>
      sql.toLowerCase().includes('employer_assessment_rows') &&
      sql.toLowerCase().includes('insert into')
    );
    expect(upsertCalls.length).toBeGreaterThan(0);
    // Find the call params where the application_id parameter is passed
    const upsertParams = upsertCalls[0][1];
    expect(upsertParams).toContain(applicationId);
  });
});
