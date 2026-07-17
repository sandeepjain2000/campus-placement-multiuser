/** @jest-environment node */

const { sanitizePhoneInput, getPhonesListValidationError } = require('@/lib/validators');

describe('sanitizePhoneInput', () => {
  it('strips letters and emoji', () => {
    expect(sanitizePhoneInput('zzabc-not-a-phone')).toBe('---');
    expect(sanitizePhoneInput('98765😀43210')).toBe('9876543210');
    expect(sanitizePhoneInput('+91 98765-43210')).toBe('+91 98765-43210');
  });
});

describe('getPhonesListValidationError', () => {
  it('rejects alphabetic phone values', () => {
    const err = getPhonesListValidationError([{ label: 'Primary', value: 'notaphone' }]);
    expect(err).toBeTruthy();
  });

  it('accepts empty rows and valid numbers', () => {
    expect(getPhonesListValidationError([{ label: 'Primary', value: '' }])).toBe('');
    expect(getPhonesListValidationError([{ label: 'Primary', value: '+91 9876543210' }])).toBe('');
  });
});
