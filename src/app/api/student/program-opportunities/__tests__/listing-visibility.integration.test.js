/**
 * Student listing visibility: published only; cache cleared after employer publish changes.
 */
const mockGetServerSession = jest.fn();
const mockQuery = jest.fn();

jest.mock('next-auth/next', () => ({
  getServerSession: (...args) => mockGetServerSession(...args),
}));

jest.mock('@/lib/db', () => ({
  query: (...args) => mockQuery(...args),
}));

jest.mock('@/lib/sessionTenant', () => ({
  resolveStudentPlacementTenantIds: jest.fn(async () => ['a1000000-0000-0000-0000-000000000001']),
}));

jest.mock('@/lib/studentServer', () => ({
  getOrCreateStudentProfileId: jest.fn(async () => 's1000000-0000-0000-0000-000000000001'),
}));

jest.mock('@/lib/studentApplyEligibility', () => ({
  getStudentApplyGate: jest.fn(async () => ({
    hasResume: true,
    placementLocked: false,
    canApply: true,
    applyBlockedReason: null,
  })),
}));

jest.mock('@/lib/studentApplyProfile', () => ({
  loadStudentApplyProfile: jest.fn(async () => ({
    cgpa: 8,
    branch: 'CSE',
    department: 'B.Tech',
    batchYear: 2025,
    backlogsActive: 0,
    hasResume: true,
    isPlacementLocked: false,
  })),
}));

jest.mock('@/lib/studentBrowseGate', () => ({
  getStudentBrowseGate: jest.fn(async () => ({
    canBrowseListings: true,
    profileComplete: true,
    hasResume: true,
    browseGateTitle: null,
    browseGateMessage: null,
    profileMissingLabels: [],
    placementLocked: false,
    canApply: true,
    applyBlockedReason: null,
  })),
}));

jest.mock('@/lib/internshipPlacementRules', () => ({
  getStudentInternshipSelectionLock: jest.fn(async () => ({
    locked: false,
    selectedJobId: null,
    selection: null,
  })),
  mapProgramOpportunityRow: (r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    hasApplied: !!r.application_id,
  }),
  STUDENT_INTERNSHIP_SELECTED_LOCK_MESSAGE: 'locked',
}));

jest.mock('@/lib/migrationReady', () => ({
  jobPostingNotDeletedSql: jest.fn(async () => ''),
  jobVisibilityCollegeApprovedSql: jest.fn(async () => ''),
  programApplicationNotDeletedSql: jest.fn(async () => ''),
}));

const {
  getStudentOpportunityListCache,
  invalidateStudentOpportunityListCache,
  setStudentOpportunityListCache,
} = require('@/lib/jobPostingPublishState');

const { GET } = require('../route');

describe('GET /api/student/program-opportunities listing visibility', () => {
  beforeEach(() => {
    invalidateStudentOpportunityListCache();
    mockGetServerSession.mockResolvedValue({
      user: { role: 'student', id: 'u1000000-0000-0000-0000-000000000001', tenantId: 'a1000000-0000-0000-0000-000000000001' },
    });
    mockQuery.mockImplementation(async (sql) => {
      if (String(sql).includes('SELECT cgpa')) {
        return { rows: [{ cgpa: 8 }] };
      }
      if (String(sql).includes('sp.roll_number')) {
        return {
          rows: [
            {
              roll_number: 'R001',
              branch: 'CSE',
              department: 'B.Tech',
              cgpa: 8,
              user_phone: '9999999999',
            },
          ],
        };
      }
      if (String(sql).includes('FROM job_postings jp')) {
        return {
          rows: [
            {
              id: 'published-job',
              title: 'Visible Intern',
              status: 'published',
              application_id: null,
            },
          ],
        };
      }
      return { rows: [] };
    });
  });

  it('queries only published postings for student discovery', async () => {
    await GET({ url: 'http://localhost/api/student/program-opportunities?kind=internship' });
    const listingSql = mockQuery.mock.calls.find(([sql]) => String(sql).includes('FROM job_postings jp'))?.[0];
    expect(String(listingSql)).toContain("jp.status = 'published'");
    expect(String(listingSql)).not.toMatch(/is_visible\s*=\s*true/i);
    expect(String(listingSql)).not.toMatch(/published_at\s+IS\s+NOT\s+NULL/i);
  });

  it('serves fresh data after cache invalidation (draft hide / re-publish)', async () => {
    setStudentOpportunityListCache(['a1000000-0000-0000-0000-000000000001'], 'internship', {
      items: [{ id: 'stale-draft-still-listed', title: 'Stale' }],
    });

    const cachedRes = await GET({
      url: 'http://localhost/api/student/program-opportunities?kind=internship',
    });
    const cachedBody = await cachedRes.json();
    expect(cachedBody.items[0].id).toBe('stale-draft-still-listed');

    invalidateStudentOpportunityListCache();

    const freshRes = await GET({
      url: 'http://localhost/api/student/program-opportunities?kind=internship',
    });
    const freshBody = await freshRes.json();
    expect(freshBody.items[0].id).toBe('published-job');
  });
});
