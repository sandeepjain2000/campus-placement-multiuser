/**
 * Integration-style tests for publish/draft visibility sync on employer job PATCH.
 */
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

const { invalidateStudentOpportunityListCache, setStudentOpportunityListCache } = require('@/lib/jobPostingPublishState');

const { PATCH } = require('../route');

const EMPLOYER_USER = 'u1000000-0000-0000-0000-000000000001';
const EMPLOYER_ID = 'c1000000-0000-0000-0000-000000000001';
const JOB_ID = 'j1000000-0000-0000-0000-000000000099';

function publishedJobRow(overrides = {}) {
  return {
    id: JOB_ID,
    employer_id: EMPLOYER_ID,
    title: 'Summer Intern',
    description: 'Duration: 3 months',
    job_type: 'internship',
    status: 'published',
    salary_min: 15000,
    salary_max: 20000,
    min_cgpa: 7,
    vacancies: 3,
    skills_required: ['Python'],
    additional_info: JSON.stringify({ startDate: '2026-06-15', endDate: '2026-09-15' }),
    ...overrides,
  };
}

function buildPatchRequest(body) {
  return {
    json: async () => body,
  };
}

describe('PATCH /api/employer/jobs publish visibility', () => {
  beforeEach(() => {
    invalidateStudentOpportunityListCache();
    mockGetServerSession.mockResolvedValue({
      user: { role: 'employer', id: EMPLOYER_USER },
    });
    mockQuery.mockImplementation(async (sql) => {
      if (String(sql).includes('employer_profiles')) {
        return { rows: [{ id: EMPLOYER_ID, company_name: 'TechCorp' }] };
      }
      return { rows: [] };
    });
  });

  it('closes a published internship via action close', async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (String(sql).includes('employer_profiles')) {
        return { rows: [{ id: EMPLOYER_ID, company_name: 'TechCorp' }] };
      }
      if (String(sql).includes("status = 'closed'")) {
        return { rows: [{ id: JOB_ID, title: 'Summer Intern', job_type: 'internship', status: 'closed' }] };
      }
      return { rows: [] };
    });

    const res = await PATCH(buildPatchRequest({ action: 'close', id: JOB_ID }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.job.status).toBe('closed');
  });

  it('returns 400 when moving a published posting back to draft', async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const client = {
        query: async (sql) => {
          if (String(sql).includes('FROM job_postings') && String(sql).includes('SELECT')) {
            return { rows: [publishedJobRow()] };
          }
          throw new Error('should not update');
        },
      };
      return fn(client);
    });

    const res = await PATCH(
      buildPatchRequest({
        id: JOB_ID,
        title: 'Summer Intern',
        jobType: 'internship',
        status: 'draft',
        keywords: 'Python',
        startDate: '2026-06-15',
        endDate: '2026-09-15',
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/cannot be moved back to draft/i);
  });

  it('invalidates cached student opportunity lists after a successful status change', async () => {
    setStudentOpportunityListCache(['tenant-a'], 'internship', { items: [{ id: 'stale' }] });

    mockTransaction.mockImplementation(async (fn) => {
      const client = {
        query: async (sql, params) => {
          if (String(sql).includes('FROM job_postings') && String(sql).includes('SELECT')) {
            return { rows: [publishedJobRow({ status: 'draft' })] };
          }
          if (String(sql).startsWith('UPDATE job_postings') && String(sql).includes('status')) {
            return { rows: [{ id: JOB_ID, title: 'Summer Intern', job_type: 'internship', status: 'published' }] };
          }
          if (String(sql).includes('job_posting_visibility') && String(sql).includes('SELECT')) {
            return { rows: [{ id: 'a1000000-0000-0000-0000-000000000001' }] };
          }
          if (String(sql).includes('employer_approvals')) {
            return { rows: [{ '?column?': 1 }] };
          }
          if (String(sql).includes('INSERT INTO job_posting_visibility')) {
            return { rows: [] };
          }
          if (String(sql).includes('is_visible = true')) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      };
      return fn(client);
    });

    const res = await PATCH(
      buildPatchRequest({
        id: JOB_ID,
        title: 'Summer Intern',
        description: 'Duration: 3 months',
        jobType: 'internship',
        status: 'published',
        keywords: 'Python',
        tenantIds: ['a1000000-0000-0000-0000-000000000001'],
        startDate: '2026-06-15',
        endDate: '2026-09-15',
      }),
    );

    expect(res.status).toBe(200);
    const { getStudentOpportunityListCache } = require('@/lib/jobPostingPublishState');
    expect(getStudentOpportunityListCache(['tenant-a'], 'internship')).toBeNull();
  });
});
