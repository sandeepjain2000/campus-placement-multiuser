const { validateAdminEmployerForm } = require('@/lib/adminEmployerForm');

describe('validateAdminEmployerForm', () => {
  it('requires company name', () => {
    expect(validateAdminEmployerForm({ name: '   ' })).toMatch(/required/i);
  });

  it('rejects invalid contact email', () => {
    expect(
      validateAdminEmployerForm({ name: 'TechCorp', contactEmail: 'not-an-email' }),
    ).toMatch(/email/i);
  });

  it('rejects invalid contact phone', () => {
    expect(
      validateAdminEmployerForm({ name: 'TechCorp', contactPhone: '9876543210' }),
    ).toMatch(/phone/i);
  });

  it('accepts a valid minimal form', () => {
    expect(validateAdminEmployerForm({ name: 'TechCorp Solutions' })).toBeNull();
  });
});
