/** @jest-environment node */

const { validateStudentAvatarFile } = require('@/lib/studentAvatarUpload');

describe('studentAvatarUpload validation codes', () => {
  it('includes VAL-STU-PHOTO codes on validation failures', () => {
    expect(validateStudentAvatarFile(null).error).toMatch(/^\[VAL-STU-PHOTO-REQ\]/);
    expect(
      validateStudentAvatarFile({ name: 'a.txt', type: 'text/plain', size: 10 }).error,
    ).toMatch(/^\[VAL-STU-PHOTO-FMT\]/);
    expect(
      validateStudentAvatarFile({ name: 'a.jpg', type: 'image/jpeg', size: 3 * 1024 * 1024 }).error,
    ).toMatch(/^\[VAL-STU-PHOTO-RNG\]/);
  });
});
