const { toDeadlineTimestampIso } = require('../dateOnly');
const { mapBulkOfferGenerateError } = require('../bulkOfferGenerate');

describe('toDeadlineTimestampIso', () => {
  it('returns null for invalid dates without throwing', () => {
    expect(toDeadlineTimestampIso('not-a-date')).toBeNull();
    expect(toDeadlineTimestampIso('')).toBeNull();
    expect(toDeadlineTimestampIso(null)).toBeNull();
  });

  it('returns ISO string for valid YMD', () => {
    const iso = toDeadlineTimestampIso('2026-06-24');
    expect(iso).toMatch(/^2026-06-24/);
  });
});

describe('mapBulkOfferGenerateError', () => {
  it('maps offer_kind check violations to migration hint', () => {
    const msg = mapBulkOfferGenerateError({
      code: '23514',
      message: 'new row violates check constraint "offers_offer_kind_check"',
    });
    expect(msg).toMatch(/db:migrate:095/);
  });

  it('maps invalid time value errors', () => {
    expect(mapBulkOfferGenerateError(new RangeError('Invalid time value'))).toMatch(/template/i);
  });
});

const { dedupeInternshipOfferRows } = require('../bulkOfferGenerate');
const { shouldEmailStudentOnInternshipSelection } = require('../internshipEmailPolicy');

describe('dedupeInternshipOfferRows', () => {
  it('collapses duplicate program applications', () => {
    const rows = [
      { program_application_id: 'a1', student_id: 's1', student_name: 'Arjun' },
      { program_application_id: 'a1', student_id: 's1', student_name: 'Arjun' },
    ];
    expect(dedupeInternshipOfferRows(rows)).toHaveLength(1);
  });
});

describe('shouldEmailStudentOnInternshipSelection', () => {
  it('skips selection email for internship program applications', () => {
    expect(shouldEmailStudentOnInternshipSelection('program', 'internship')).toBe(false);
  });

  it('keeps selection email for drives and jobs', () => {
    expect(shouldEmailStudentOnInternshipSelection('drive', null)).toBe(true);
    expect(shouldEmailStudentOnInternshipSelection('program', 'full_time')).toBe(true);
  });
});
