const {
  assertEmployerMaySetJobStatus,
  closePublishedJobPosting,
  withdrawPublishedJobPosting,
  runPublishedEmployerPatch,
  getStudentOpportunityListCache,
  invalidateStudentOpportunityListCache,
  publishedCoreFieldsChanged,
  setStudentOpportunityListCache,
} = require('@/lib/jobPostingPublishState');

const { studentListedJobPostingSql } = require('@/lib/studentOpportunityQuery');

describe('jobPostingPublishState', () => {
  beforeEach(() => {
    invalidateStudentOpportunityListCache();
  });

  it('rejects published → draft transitions', () => {
    expect(() => assertEmployerMaySetJobStatus('published', 'draft')).toThrow(/cannot be moved back to draft/i);
  });

  it('allows draft → published transitions', () => {
    expect(() => assertEmployerMaySetJobStatus('draft', 'published')).not.toThrow();
  });

  it('detects core field changes on published postings', () => {
    const existing = {
      title: 'Engineer',
      job_type: 'internship',
      salary_min: 10000,
      salary_max: 20000,
      min_cgpa: 7,
      vacancies: 2,
      skills_required: ['Java'],
    };
    expect(
      publishedCoreFieldsChanged(existing, { title: 'Lead Engineer' }, ['Java']),
    ).toBe(true);
    expect(
      publishedCoreFieldsChanged(
        existing,
        { description: 'Updated notes only', additionalInfo: 'Parking provided' },
        ['Java'],
      ),
    ).toBe(false);
  });

  it('runPublishedEmployerPatch falls back when additional_info column is missing', async () => {
    const calls = [];
    const client = {
      query: jest.fn(async (sql) => {
        calls.push(sql);
        if (String(sql).includes('additional_info')) {
          const err = new Error('column "additional_info" does not exist');
          err.code = '42703';
          throw err;
        }
        return { rows: [{ id: 'job-1', title: 'Intern', job_type: 'internship', status: 'published' }] };
      }),
    };

    const res = await runPublishedEmployerPatch(
      client,
      { id: 'job-1', employer_id: 'emp-1', additional_info: '', description: 'Old' },
      { description: 'New notes', additionalInfo: '{"specializations":""}' },
    );

    expect(res.rows[0].status).toBe('published');
    expect(calls).toHaveLength(2);
    expect(String(calls[1])).not.toMatch(/additional_info/i);
  });

  it('withdrawPublishedJobPosting cancels job and marks applications withdrawn', async () => {
    const calls = [];
    const db = {
      query: jest.fn(async (sql) => {
        calls.push(String(sql));
        if (String(sql).includes('UPDATE job_postings') && String(sql).includes('cancelled')) {
          return { rows: [{ id: 'job-1', title: 'Intern', job_type: 'internship', status: 'cancelled' }], rowCount: 1 };
        }
        if (String(sql).includes('program_applications')) {
          return { rows: [], rowCount: 2 };
        }
        return { rows: [] };
      }),
    };

    const res = await withdrawPublishedJobPosting(db, 'job-1', 'emp-1');

    expect(res.job.status).toBe('cancelled');
    expect(res.applicationsWithdrawn).toBe(2);
    expect(calls.some((s) => s.includes('program_applications') && s.includes('withdrawn'))).toBe(true);
  });

  it('closePublishedJobPosting falls back when is_visible column is missing', async () => {
    const calls = [];
    const db = {
      query: jest.fn(async (sql) => {
        calls.push(sql);
        if (String(sql).includes('is_visible')) {
          const err = new Error('column "is_visible" does not exist');
          err.code = '42703';
          throw err;
        }
        return { rows: [{ id: 'job-1', title: 'Intern', job_type: 'internship', status: 'closed' }] };
      }),
    };

    const res = await closePublishedJobPosting(db, 'job-1', 'emp-1');

    expect(res.rows[0].status).toBe('closed');
    expect(calls).toHaveLength(2);
    expect(String(calls[1])).not.toMatch(/is_visible/i);
  });

  it('invalidateStudentOpportunityListCache clears cached student lists', () => {
    setStudentOpportunityListCache(['tenant-a'], 'internship', { items: [{ id: 'job-1' }] });
    expect(getStudentOpportunityListCache(['tenant-a'], 'internship')?.payload?.items).toHaveLength(1);
    invalidateStudentOpportunityListCache();
    expect(getStudentOpportunityListCache(['tenant-a'], 'internship')).toBeNull();
  });
});

describe('studentListedJobPostingSql', () => {
  it('filters on status = published', () => {
    expect(studentListedJobPostingSql('jp')).toBe("jp.status = 'published'");
    expect(studentListedJobPostingSql()).toContain("= 'published'");
  });
});
