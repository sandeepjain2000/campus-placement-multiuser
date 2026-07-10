const {
  normalizeInternshipGuideName,
  validateInternshipGuidePayload,
  mapInternshipGuideRow,
  isEligibleInternshipApplicationStatus,
} = require('@/lib/internshipGuide');

describe('internshipGuide', () => {
  it('normalizes guide name whitespace', () => {
    expect(normalizeInternshipGuideName('  Dr.  Priya   Sharma  ')).toBe('Dr. Priya Sharma');
  });

  it('validates guide payload', () => {
    expect(validateInternshipGuidePayload({ guideName: 'A' }).error).toMatch(/2 characters/);
    expect(validateInternshipGuidePayload({ guideName: 'Dr. Rao', guideEmail: 'bad' }).error).toMatch(/valid guide email/);
    expect(validateInternshipGuidePayload({ guideName: 'Dr. Rao', guideEmail: 'guide@college.edu' })).toMatchObject({
      guideName: 'Dr. Rao',
      guideEmail: 'guide@college.edu',
    });
  });

  it('reuses eligible internship statuses', () => {
    expect(isEligibleInternshipApplicationStatus('in_progress')).toBe(true);
    expect(isEligibleInternshipApplicationStatus('applied')).toBe(false);
  });

  it('maps database row', () => {
    expect(
      mapInternshipGuideRow({
        id: 'g1',
        program_application_id: 'pa1',
        guide_name: 'Dr. Rao',
        guide_email: 'rao@college.edu',
        guide_phone: '9999999999',
        guide_department: 'CSE',
        guide_notes: 'Weekly check-in',
        updated_at: '2026-06-02T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'g1',
      guideName: 'Dr. Rao',
      guideDepartment: 'CSE',
    });
    expect(mapInternshipGuideRow(null)).toBeNull();
  });
});
