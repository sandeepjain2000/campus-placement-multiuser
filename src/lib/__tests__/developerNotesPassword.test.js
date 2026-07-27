const { verifyDevNotesPassword } = require('../developerNotesPassword');
const { createDevNotesSessionToken, verifyDevNotesSessionToken } = require('../developerNotesAuth');

describe('developer notes gate', () => {
  const prevPlain = process.env.DEVELOPER_NOTES_PASSWORD;

  afterEach(() => {
    if (prevPlain === undefined) delete process.env.DEVELOPER_NOTES_PASSWORD;
    else process.env.DEVELOPER_NOTES_PASSWORD = prevPlain;
  });

  test('accepts the default team password', () => {
    delete process.env.DEVELOPER_NOTES_PASSWORD;
    expect(verifyDevNotesPassword('Wolfe123@#')).toBe(true);
    expect(verifyDevNotesPassword('wrong')).toBe(false);
    expect(verifyDevNotesPassword('')).toBe(false);
  });

  test('accepts DEVELOPER_NOTES_PASSWORD env override', () => {
    process.env.DEVELOPER_NOTES_PASSWORD = 'TempOverride!';
    expect(verifyDevNotesPassword('TempOverride!')).toBe(true);
    expect(verifyDevNotesPassword('Wolfe123@#')).toBe(false);
  });

  test('session token round-trips', async () => {
    const token = await createDevNotesSessionToken('unit-test-secret');
    await expect(verifyDevNotesSessionToken(token, 'unit-test-secret')).resolves.toBe(true);
    await expect(verifyDevNotesSessionToken(token, 'other-secret')).resolves.toBe(false);
  });
});
