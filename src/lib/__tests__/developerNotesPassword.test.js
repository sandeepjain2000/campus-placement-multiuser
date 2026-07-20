const { verifyDevNotesPassword } = require('../developerNotesPassword');
const { createDevNotesSessionToken, verifyDevNotesSessionToken } = require('../developerNotesAuth');

describe('developer notes gate', () => {
  const prevPlain = process.env.DEVELOPER_NOTES_PASSWORD;
  const prevHash = process.env.DEVELOPER_NOTES_PASSWORD_HASH;

  afterEach(() => {
    if (prevPlain === undefined) delete process.env.DEVELOPER_NOTES_PASSWORD;
    else process.env.DEVELOPER_NOTES_PASSWORD = prevPlain;
    if (prevHash === undefined) delete process.env.DEVELOPER_NOTES_PASSWORD_HASH;
    else process.env.DEVELOPER_NOTES_PASSWORD_HASH = prevHash;
  });

  test('accepts the team password against the default bcrypt hash', async () => {
    delete process.env.DEVELOPER_NOTES_PASSWORD;
    delete process.env.DEVELOPER_NOTES_PASSWORD_HASH;
    await expect(verifyDevNotesPassword('Wolfe123@#')).resolves.toBe(true);
    await expect(verifyDevNotesPassword('wrong')).resolves.toBe(false);
  });

  test('accepts DEVELOPER_NOTES_PASSWORD plaintext override', async () => {
    process.env.DEVELOPER_NOTES_PASSWORD = 'TempOverride!';
    await expect(verifyDevNotesPassword('TempOverride!')).resolves.toBe(true);
    await expect(verifyDevNotesPassword('Wolfe123@#')).resolves.toBe(true);
  });

  test('session token round-trips', async () => {
    const token = await createDevNotesSessionToken('unit-test-secret');
    await expect(verifyDevNotesSessionToken(token, 'unit-test-secret')).resolves.toBe(true);
    await expect(verifyDevNotesSessionToken(token, 'other-secret')).resolves.toBe(false);
  });
});
