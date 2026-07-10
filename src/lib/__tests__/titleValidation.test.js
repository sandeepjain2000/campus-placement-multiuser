const {
  MAX_TITLE_LENGTH,
  normalizeTitle,
  TITLE_PATTERN,
  validateTitle,
} = require('@/lib/validators');

describe('validateTitle', () => {
  it('accepts alphanumeric titles with spaces, hyphens, and underscores', () => {
    expect(validateTitle('Software Development Engineer')).toBe('');
    expect(validateTitle('SDE-2')).toBe('');
    expect(validateTitle('ML_Engineer')).toBe('');
    expect(TITLE_PATTERN.test('Backend Dev 2026')).toBe(true);
  });

  it('rejects special characters outside the allowed set', () => {
    expect(validateTitle('Developer @ Home')).toMatch(/may only contain/i);
    expect(validateTitle('Role (Contract)')).toMatch(/may only contain/i);
    expect(validateTitle('C++ Developer')).toMatch(/may only contain/i);
  });

  it('rejects titles that do not start or end with alphanumeric characters', () => {
    expect(validateTitle('-Invalid')).toMatch(/may only contain/i);
    expect(validateTitle('Invalid_')).toMatch(/may only contain/i);
  });

  it('enforces minimum length and normalizes whitespace', () => {
    expect(validateTitle('AB')).toMatch(/at least 3/i);
    expect(normalizeTitle('  Senior   Engineer  ')).toBe('Senior Engineer');
  });

  it('enforces max length', () => {
    const long = 'A'.repeat(MAX_TITLE_LENGTH + 1);
    expect(validateTitle(long)).toMatch(/255 characters or fewer/i);
  });
});
