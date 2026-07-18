const {
  validateAdminUserForm,
  ADMIN_USER_ERRORS,
  ADMIN_USER_ROLES,
  mapAdminUserRow,
} = require('../adminUserForm');

describe('adminUserForm', () => {
  it('requires first name and valid role', () => {
    expect(validateAdminUserForm({ firstName: '', role: 'student' }).ok).toBe(false);
    expect(validateAdminUserForm({ firstName: 'Ada', role: 'nope' }).error).toBe(
      ADMIN_USER_ERRORS.INVALID_ROLE,
    );
    expect(validateAdminUserForm({ firstName: 'Ada', role: 'student', phone: '' }).ok).toBe(true);
  });

  it('rejects invalid phone characters', () => {
    expect(validateAdminUserForm({ firstName: 'Ada', role: 'student', phone: 'abc' }).error).toBe(
      ADMIN_USER_ERRORS.INVALID_PHONE,
    );
  });

  it('maps DB rows for the admin UI', () => {
    const mapped = mapAdminUserRow({
      id: 'u1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      phone: null,
      role: 'student',
      is_active: true,
      is_verified: false,
    });
    expect(mapped.name).toBe('Ada Lovelace');
    expect(mapped.active).toBe(true);
    expect(ADMIN_USER_ROLES).toContain('placement_committee');
  });
});
