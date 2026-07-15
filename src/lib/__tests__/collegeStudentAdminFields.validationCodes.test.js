/** @jest-environment node */

const { validateCollegeStudentForm, initialCollegeStudentForm } = require('@/lib/collegeStudentAdminFields');

describe('collegeStudentAdminFields validation codes', () => {
  it('prefixes identity and program errors with VAL codes', () => {
    const form = {
      ...initialCollegeStudentForm(),
      name: '',
      email: 'not-an-email',
      roll_number: '',
      department: '',
      academic_program_code: '',
      batch: '',
    };
    const { errors, valid } = validateCollegeStudentForm(form, { isEdit: false, collegeShortCode: 'IITM' });
    expect(valid).toBe(false);
    expect(errors.name).toMatch(/^\[VAL-STU-NAME-REQ\]/);
    expect(errors.email).toMatch(/^\[VAL-AUTH-EMAIL-/);
    expect(errors.roll_number).toMatch(/^\[VAL-STU-ROLL-/);
    expect(errors.department).toMatch(/^\[VAL-STU-PROG-REQ\]/);
    expect(errors.batch).toMatch(/^\[VAL-STU-BATCH-/);
  });
});
