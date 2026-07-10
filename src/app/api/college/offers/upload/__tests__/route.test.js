const mockGetServerSession = jest.fn();

jest.mock('next-auth/next', () => ({
  getServerSession: (...args) => mockGetServerSession(...args),
}));

const { POST } = require('../route');

function buildRequest() {
  return {
    formData: async () => ({
      get: () => null,
    }),
  };
}

describe('POST /api/college/offers/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { role: 'college_admin', tenantId: 'a1000000-0000-0000-0000-000000000001' },
    });
  });

  it('returns 410 — CSV import removed', async () => {
    const res = await POST(buildRequest());
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/CSV import was removed/i);
  });
});
