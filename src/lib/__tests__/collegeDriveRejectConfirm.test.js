const {
  REJECT_DRIVE_CONFIRM_PHRASE,
  buildRejectDriveConfirmMessage,
} = require('@/lib/collegeDriveRejectConfirm');

describe('collegeDriveRejectConfirm', () => {
  it('requires typing REJECT', () => {
    expect(REJECT_DRIVE_CONFIRM_PHRASE).toBe('REJECT');
  });

  it('builds a strong multi-line warning with company and role', () => {
    const message = buildRejectDriveConfirmMessage({
      company: 'TechCorp',
      role: 'SDE Intern',
      date: '2026-08-01',
    });
    expect(message).toContain('TechCorp');
    expect(message).toContain('SDE Intern');
    expect(message).toContain('cannot be undone');
    expect(message).toContain('new drive request');
  });
});
