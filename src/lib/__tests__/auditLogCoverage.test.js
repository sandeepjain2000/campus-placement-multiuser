const { auditNewValues } = require('@/lib/auditLog');

describe('auditNewValues', () => {
  it('stores a searchable summary for Audit Reports display', () => {
    expect(auditNewValues('College updated', { name: 'NITT' })).toEqual({
      name: 'NITT',
      summary: 'College updated',
    });
  });

  it('returns null when empty', () => {
    expect(auditNewValues('')).toBeNull();
    expect(auditNewValues('   ', null)).toBeNull();
  });
});

describe('super-admin audit coverage', () => {
  const fs = require('fs');
  const path = require('path');

  function read(rel) {
    return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
  }

  it('logs college create and update', () => {
    expect(read('src/app/api/admin/colleges/route.js')).toMatch(/action: 'CREATE_COLLEGE'/);
    expect(read('src/app/api/admin/colleges/[id]/route.js')).toMatch(/UPDATE_COLLEGE/);
    expect(read('src/app/api/admin/colleges/[id]/route.js')).toMatch(/writeAuditLog/);
  });

  it('logs employer update and registration decisions', () => {
    expect(read('src/app/api/admin/employers/[id]/route.js')).toMatch(/UPDATE_EMPLOYER/);
    expect(read('src/app/api/admin/pending-registrations/route.js')).toMatch(/APPROVE_REGISTRATION/);
    expect(read('src/app/api/admin/pending-registrations/route.js')).toMatch(/REJECT_REGISTRATION/);
  });
});
