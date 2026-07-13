const {
  buildInternshipAdditionalInfo,
  buildInternshipDescription,
  computeInternshipDurationMonths,
  parseInternshipAdditionalInfo,
  parseInternshipDescription,
  resolveInternshipDatesFromRow,
  resolveMaxBacklogsInput,
  validateInternshipBatchYearField,
  validateInternshipBatchYearForSubmit,
  validateInternshipDatesForSubmit,
} = require('@/lib/internshipPostingMeta');

describe('internshipPostingMeta dates', () => {
  it('validates publish-required dates', () => {
    expect(validateInternshipDatesForSubmit('', '', { required: true })).toMatch(/required/i);
    expect(validateInternshipDatesForSubmit('2026-06-01', '', { required: true })).toMatch(/end date/i);
    expect(validateInternshipDatesForSubmit('2026-06-01', '2026-05-01', { required: true })).toMatch(/after/);
    expect(validateInternshipDatesForSubmit('2026-06-01', '2026-08-31', { required: true })).toBeNull();
    expect(validateInternshipDatesForSubmit('', '', { required: false })).toBeNull();
  });

  it('stores and reads dates from additional_info JSON', () => {
    const raw = buildInternshipAdditionalInfo({
      specializations: ['ML'],
      startDate: '2026-06-01',
      endDate: '2026-08-31',
    });
    const parsed = parseInternshipAdditionalInfo(raw);
    expect(parsed.specializations).toEqual(['ML']);
    expect(parsed.startDate).toBe('2026-06-01');
    expect(parsed.endDate).toBe('2026-08-31');
  });

  it('builds description with internship period line', () => {
    const text = buildInternshipDescription('2026-06-01', '2026-08-31', 'Remote ok');
    expect(text).toContain('Internship period: 2026-06-01 to 2026-08-31.');
    expect(text).toContain('Duration: 3 months.');
    expect(text).toContain('Remote ok');
  });

  it('resolves dates from DB row, JSON, or description', () => {
    expect(
      resolveInternshipDatesFromRow({
        internship_start_date: '2026-01-01',
        internship_end_date: '2026-03-31',
      }),
    ).toEqual({ startDate: '2026-01-01', endDate: '2026-03-31' });

    expect(
      resolveInternshipDatesFromRow({
        additional_info: JSON.stringify({ startDate: '2026-04-01', endDate: '2026-06-30' }),
      }),
    ).toEqual({ startDate: '2026-04-01', endDate: '2026-06-30' });

    const description = buildInternshipDescription('2026-07-01', '2026-12-31', '');
    expect(resolveInternshipDatesFromRow({ description })).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-12-31',
    });
  });

  it('parses legacy duration-only descriptions', () => {
    const parsed = parseInternshipDescription('Duration: 6 months.\n\nPaid internship.');
    expect(parsed.durationMonths).toBe('6');
    expect(parsed.notes).toBe('Paid internship.');
  });

  it('computes inclusive month span', () => {
    expect(computeInternshipDurationMonths('2026-06-01', '2026-08-31')).toBe(3);
    expect(computeInternshipDurationMonths('2026-01-01', '2026-01-31')).toBe(1);
  });

  it('defaults empty maxBacklogs to 0 on publish', () => {
    expect(resolveMaxBacklogsInput('')).toBe(0);
    expect(resolveMaxBacklogsInput(null)).toBe(0);
    expect(resolveMaxBacklogsInput(undefined)).toBe(0);
    expect(resolveMaxBacklogsInput('3')).toBe(3);
  });
});

describe('internshipPostingMeta batch year', () => {
  const anchor = new Date('2026-07-09T12:00:00Z');

  it('validates publish-required batch year', () => {
    expect(validateInternshipBatchYearForSubmit('', { required: true, date: anchor })).toMatch(/required/i);
    expect(validateInternshipBatchYearForSubmit('2025', { required: true, date: anchor })).toMatch(/before 2026/i);
    expect(validateInternshipBatchYearForSubmit('2031', { required: true, date: anchor })).toMatch(/after 2030/i);
    expect(validateInternshipBatchYearForSubmit('26', { required: true, date: anchor })).toMatch(/4-digit/i);
    expect(validateInternshipBatchYearForSubmit('2026', { required: true, date: anchor })).toBeNull();
    expect(validateInternshipBatchYearForSubmit('2030', { required: true, date: anchor })).toBeNull();
    expect(validateInternshipBatchYearForSubmit('', { required: false, date: anchor })).toBeNull();
  });

  it('resolves valid batch year value', () => {
    expect(validateInternshipBatchYearField('2028', { date: anchor }).value).toBe(2028);
    expect(validateInternshipBatchYearField('2025', { date: anchor }).value).toBeNull();
  });
});
