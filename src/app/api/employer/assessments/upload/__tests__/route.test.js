const { ASSESS_UPLOAD_DB_ERROR } = require('@/lib/assessmentUploadDbError');

const mockGetServerSession = jest.fn();
const mockQuery = jest.fn();
const mockTransaction = jest.fn();

jest.mock('next-auth/next', () => ({
  getServerSession: (...args) => mockGetServerSession(...args),
}));

jest.mock('@/lib/db', () => ({
  query: (...args) => mockQuery(...args),
  transaction: (...args) => mockTransaction(...args),
}));

jest.mock('@/lib/s3', () => ({
  isS3Configured: () => false,
  putObjectText: jest.fn(),
}));

const { POST } = require('../route');

const EMPLOYER_ID = 'c1000000-0000-0000-0000-000000000001';
const TENANT_ID = 'a1000000-0000-0000-0000-000000000001';
const DRIVE_ID = 'e1000000-0000-0000-0000-000000000001';

function buildCsv() {
  return [
    'system_id,college_roll_no,placement_drive_id,hiring_result',
    `IITM-001,001,${DRIVE_ID},shortlist`,
  ].join('\n');
}

function buildRequest() {
  const file = {
    name: 'results.csv',
    text: async () => buildCsv(),
  };
  const fields = {
    file,
    kind: 'drive',
    tenantId: TENANT_ID,
    driveId: DRIVE_ID,
  };
  return {
    formData: async () => ({
      get: (key) => fields[key] ?? null,
    }),
  };
}

describe('POST /api/employer/assessments/upload', () => {
  beforeEach(() => {
    mockGetServerSession.mockResolvedValue({
      user: { role: 'employer', id: 'u1000000-0000-0000-0000-000000000001' },
    });
    mockQuery.mockImplementation(async (sql) => {
      if (String(sql).includes('employer_profiles')) {
        return { rows: [{ id: EMPLOYER_ID }] };
      }
      return { rows: [] };
    });
    mockTransaction.mockImplementation(async () => {
      const err = new Error('missing FROM-clause entry for table "eau"');
      err.code = '42P01';
      throw err;
    });
  });

  it('returns a safe 500 message when the database throws a missing FROM-clause error', async () => {
    const res = await POST(buildRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: ASSESS_UPLOAD_DB_ERROR });
    expect(JSON.stringify(body)).not.toMatch(/missing FROM-clause/i);
    expect(JSON.stringify(body)).not.toMatch(/\beau\b/i);
  });
});
