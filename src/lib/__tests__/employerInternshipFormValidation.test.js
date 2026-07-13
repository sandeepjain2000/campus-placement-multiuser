const {
  mapEmployerInternshipApiError,
  validateEmployerInternshipForm,
} = require('@/lib/employerInternshipFormValidation');

describe('employerInternshipFormValidation', () => {
  const currentYear = new Date().getFullYear();
  const validBase = {
    title: 'Summer Data Intern',
    startDate: `${currentYear}-07-01`,
    endDate: `${currentYear}-12-31`,
    batchYear: String(currentYear),
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

  it('requires batch year on publish', () => {
    const result = validateEmployerInternshipForm({ ...validBase, batchYear: '' });
    expect(result.fieldErrors.batchYear).toMatch(/required/i);
    expect(result.formError).toMatch(/required/i);
  });

  it('rejects past batch year on publish', () => {
    const past = String(new Date().getFullYear() - 1);
    const result = validateEmployerInternshipForm({ ...validBase, batchYear: past });
    expect(result.fieldErrors.batchYear).toMatch(/cannot be before/i);
  });

  it('rejects batch year more than 4 years ahead', () => {
    const future = String(new Date().getFullYear() + 5);
    const result = validateEmployerInternshipForm({ ...validBase, batchYear: future });
    expect(result.fieldErrors.batchYear).toMatch(/cannot be after/i);
  });

  it('allows empty batch year on draft save', () => {
    const result = validateEmployerInternshipForm({ ...validBase, batchYear: '', asDraft: true });
    expect(result.fieldErrors.batchYear).toBeUndefined();
    expect(result.batchYear).toBeNull();
  });
});
