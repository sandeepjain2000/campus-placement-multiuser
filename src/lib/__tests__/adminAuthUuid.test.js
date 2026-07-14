const { isUuid } = require('@/lib/adminAuth');

describe('adminAuth isUuid (seed-compatible)', () => {
  it('accepts demo seed tenant ids that Postgres stores as uuid', () => {
    expect(isUuid('a1000000-0000-0000-0000-000000000001')).toBe(true);
    expect(isUuid('a1000000-0000-0000-0000-000000000002')).toBe(true);
  });

  it('accepts RFC-variant UUIDs', () => {
    expect(isUuid('a1000000-0000-4000-8000-000000000001')).toBe(true);
  });

  it('rejects non-uuid strings', () => {
    expect(isUuid('add')).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
