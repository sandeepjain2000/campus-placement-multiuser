const {
  isImpersonating,
  getImpersonatorId,
  sessionClaimsFromUserRow,
  buildImpersonationResponsePayload,
} = require('@/lib/impersonation');

describe('impersonation helpers', () => {
  it('detects impersonation from session.user', () => {
    expect(isImpersonating({ user: { impersonatorId: 'a-uuid' } })).toBe(true);
    expect(isImpersonating({ user: { impersonatorId: null } })).toBe(false);
    expect(isImpersonating({ impersonatorId: 'token-uuid' })).toBe(true);
    expect(isImpersonating(null)).toBe(false);
  });

  it('reads impersonator id', () => {
    expect(getImpersonatorId({ user: { impersonatorId: 'abc' } })).toBe('abc');
    expect(getImpersonatorId({ user: {} })).toBeNull();
  });

  it('maps user rows to session claims', () => {
    const claims = sessionClaimsFromUserRow({
      id: 'u1',
      email: 'admin@college.edu',
      communication_email: null,
      first_name: 'Ada',
      last_name: 'Admin',
      role: 'college_admin',
      tenant_id: 't1',
      tenant_name: 'Ilead',
      tenant_slug: 'ilead',
      avatar_url: null,
      tenant_logo_url: '/logo.png',
    });
    expect(claims).toMatchObject({
      id: 'u1',
      email: 'admin@college.edu',
      communication_email: 'admin@college.edu',
      name: 'Ada Admin',
      role: 'college_admin',
      tenantId: 't1',
      tenantName: 'Ilead',
      brandLogoUrl: '/logo.png',
    });
  });

  it('builds redirect payload for college admin', () => {
    const payload = buildImpersonationResponsePayload(
      {
        id: 'u1',
        email: 'admin@college.edu',
        role: 'college_admin',
        tenantName: 'Ilead',
      },
      { impersonatorId: 'sa1' },
    );
    expect(payload).toEqual({
      ok: true,
      redirectTo: '/dashboard/college',
      role: 'college_admin',
      email: 'admin@college.edu',
      tenantName: 'Ilead',
      impersonating: true,
    });
  });
});
