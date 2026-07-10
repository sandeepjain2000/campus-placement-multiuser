const {
  mapEmployerInternshipApiError,
  validateEmployerInternshipForm,
} = require('@/lib/employerInternshipFormValidation');

describe('employerInternshipFormValidation', () => {
  const validBase = {
    title: 'Summer Data Intern',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    maxBacklogs: '0',
    minCgpa: '7',
    stipend: '25000',
    stipendMax: '35000',
    vacancies: '3',
    tenantIds: ['tenant-1'],
    asDraft: false,
  };

  it('defaults empty maxBacklogs to 0 on publish', () => {
    const result = validateEmployerInternshipForm({ ...validBase, maxBacklogs: '' });
    expect(result.fieldErrors.maxBacklogs).toBeUndefined();
    expect(result.maxBacklogs).toBe(0);
    expect(result.formError).toBeNull();
  });

  it('reports backlog errors on maxBacklogs field, not dates', () => {
    const result = validateEmployerInternshipForm({ ...validBase, maxBacklogs: '99' });
    expect(result.fieldErrors.maxBacklogs).toMatch(/between 0 and 20/i);
    expect(result.fieldErrors.startDate).toBeUndefined();
    expect(result.fieldErrors.endDate).toBeUndefined();
  });

  it('reports missing dates on date fields only', () => {
    const result = validateEmployerInternshipForm({
      ...validBase,
      startDate: '',
      endDate: '',
    });
    expect(result.fieldErrors.startDate).toMatch(/start date is required/i);
    expect(result.fieldErrors.endDate).toMatch(/end date is required/i);
    expect(String(result.formError || '')).not.toMatch(/both internship start date and end date/i);
  });

  it('maps API field hint to the correct form field', () => {
    const mapped = mapEmployerInternshipApiError('Max active backlogs must be between 0 and 20.', 'maxBacklogs');
    expect(mapped.fieldErrors.maxBacklogs).toMatch(/backlog/i);
    expect(mapped.fieldErrors.startDate).toBeUndefined();
  });
});
