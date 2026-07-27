/** Default team password for Developer Notes / data-entry unlock. */
export const DEV_NOTES_PASSWORD = 'Wolfe123@#';

/**
 * Verify the Developer Notes / data-entry gate password (plain string compare).
 * Override via DEVELOPER_NOTES_PASSWORD env if needed.
 */
export function verifyDevNotesPassword(password) {
  const candidate = String(password || '');
  if (!candidate) return false;

  const expected =
    typeof process.env.DEVELOPER_NOTES_PASSWORD === 'string' &&
    process.env.DEVELOPER_NOTES_PASSWORD.length > 0
      ? process.env.DEVELOPER_NOTES_PASSWORD
      : DEV_NOTES_PASSWORD;

  return candidate === expected;
}
