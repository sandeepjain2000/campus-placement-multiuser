const {
  normalizeInternshipSupervisorName,
  validateInternshipSupervisorPayload,
  mapInternshipSupervisorRow,
  isEligibleInternshipApplicationStatus,
} = require('@/lib/internshipSupervisor');

describe('internshipSupervisor', () => {
  it('normalizes supervisor name whitespace', () => {
    expect(normalizeInternshipSupervisorName('  Anita   Mehta  ')).toBe('Anita Mehta');
  });

  it('validates supervisor payload', () => {
    expect(validateInternshipSupervisorPayload({ supervisorName: 'A' }).error).toMatch(/2 characters/);
    expect(validateInternshipSupervisorPayload({ supervisorName: 'Anita', supervisorEmail: 'bad' }).error).toMatch(
      /valid supervisor email/,
    );
    expect(
      validateInternshipSupervisorPayload({ supervisorName: 'Anita Mehta', supervisorEmail: 'a@company.com' }),
    ).toMatchObject({
      supervisorName: 'Anita Mehta',
      supervisorEmail: 'a@company.com',
    });
  });

  it('reuses eligible internship statuses', () => {
    expect(isEligibleInternshipApplicationStatus('selected')).toBe(true);
    expect(isEligibleInternshipApplicationStatus('applied')).toBe(false);
  });

  it('maps database row', () => {
    expect(
      mapInternshipSupervisorRow({
        id: 's1',
        program_application_id: 'pa1',
        supervisor_name: 'Anita Mehta',
        supervisor_email: 'anita@company.com',
        supervisor_team: 'Platform',
        updated_at: '2026-06-02T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: 's1',
      supervisorName: 'Anita Mehta',
      supervisorTeam: 'Platform',
    });
    expect(mapInternshipSupervisorRow(null)).toBeNull();
  });
});
