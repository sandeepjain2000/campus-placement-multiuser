const {
  buildStudentApplicationSubmittedAlert,
  formatOpeningTypeLabel,
  studentApplicationsLinkForOpening,
} = require('@/lib/studentApplicationSubmittedNotify');

describe('studentApplicationSubmittedNotify', () => {
  it('builds distinct alert copy with company and role', () => {
    const a = buildStudentApplicationSubmittedAlert({
      companyName: 'TechCorp Solutions',
      roleTitle: 'Data Analyst Intern',
      jobType: 'internship',
      applicationId: 'abcdef12-3456-7890-abcd-ef1234567890',
    });
    expect(a.title).toBe('Applied: Data Analyst Intern at TechCorp Solutions');
    expect(a.message).toContain('TechCorp Solutions');
    expect(a.message).toContain('Data Analyst Intern');
    expect(a.message).toContain('internship');
    expect(a.message).toContain('abcdef12');
    expect(a.link).toBe('/dashboard/student/applications/internships');

    const b = buildStudentApplicationSubmittedAlert({
      companyName: 'Acme Corp',
      roleTitle: 'Software Engineer',
      jobType: 'full_time',
      applicationId: '11111111-2222-3333-4444-555555555555',
    });
    expect(b.title).not.toBe(a.title);
    expect(b.link).toBe('/dashboard/student/applications/jobs');
  });

  it('humanizes job types and drive links', () => {
    expect(formatOpeningTypeLabel('full_time')).toBe('Full-time job');
    expect(formatOpeningTypeLabel('internship')).toBe('Internship');
    expect(formatOpeningTypeLabel(null, { sourceKind: 'drive' })).toBe('Placement drive');
    expect(studentApplicationsLinkForOpening({ sourceKind: 'drive' })).toBe(
      '/dashboard/student/applications/drives',
    );
  });
});
