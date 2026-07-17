/** @jest-environment node */

const { formatValidationError, buildValidationErrorCode } = require('@/lib/validationErrorCode');
const { validateFieldOrError, FIELD_IDS } = require('@/lib/inputConstraints');

describe('validationErrorCode', () => {
  it('prefixes validation messages', () => {
    const msg = formatValidationError(FIELD_IDS.STUDENT_CGPA, 'CGPA is required.');
    expect(msg).toMatch(/^\[VAL-STU-CGPA-REQ\]/);
    expect(msg).toContain('CGPA is required.');
  });

  it('does not double-prefix', () => {
    const once = formatValidationError('common.title', 'Title is required.');
    expect(formatValidationError('common.title', once)).toBe(once);
  });

  it('validateFieldOrError includes code', () => {
    const err = validateFieldOrError(FIELD_IDS.COMMON_TITLE, '', { required: true, label: 'Title' });
    expect(err).toMatch(/^\[VAL-COM-TITLE-/);
  });

  it('buildValidationErrorCode is stable', () => {
    expect(buildValidationErrorCode(FIELD_IDS.EMPLOYER_MIN_CGPA, 'CGPA must be greater than 0 and at most 10.')).toBe('VAL-EMP-CGPA-RNG');
  });

  it('prefixes student photo and college form messages', () => {
    expect(formatValidationError('student.photo', 'No file selected.')).toMatch(/^\[VAL-STU-PHOTO-REQ\]/);
    expect(formatValidationError('student.photo', 'Cloud storage not configured')).toMatch(/^\[VAL-STU-PHOTO-S3\]/);
    expect(formatValidationError('student.program', 'Select an academic program or department.')).toMatch(
      /^\[VAL-STU-PROG-REQ\]/,
    );
  });

  it('rejects invalid admin pincode', () => {
    expect(validateFieldOrError(FIELD_IDS.ADMIN_PINCODE, 'abc')).toMatch(/pincode/i);
    expect(validateFieldOrError(FIELD_IDS.ADMIN_PINCODE, '123')).toMatch(/pincode/i);
    expect(validateFieldOrError(FIELD_IDS.ADMIN_PINCODE, '560001')).toBeNull();
    expect(validateFieldOrError(FIELD_IDS.ADMIN_PINCODE, '')).toBeNull();
  });
});
