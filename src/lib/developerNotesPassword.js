import bcrypt from 'bcryptjs';
import { DEV_NOTES_PASSWORD_HASH } from '@/lib/developerNotesAuth';

/**
 * Verify the Developer Notes / data-entry gate password.
 * Uses bcrypt hash (DEVELOPER_NOTES_PASSWORD_HASH or built-in default).
 * Optional ops override: DEVELOPER_NOTES_PASSWORD (plaintext) for emergency unlock.
 */
export async function verifyDevNotesPassword(password) {
  const candidate = String(password || '');
  if (!candidate) return false;

  const plainOverride = process.env.DEVELOPER_NOTES_PASSWORD;
  if (typeof plainOverride === 'string' && plainOverride.length > 0 && candidate === plainOverride) {
    return true;
  }

  const hash = String(process.env.DEVELOPER_NOTES_PASSWORD_HASH || DEV_NOTES_PASSWORD_HASH || '');
  if (!hash.startsWith('$2')) return false;

  try {
    return await bcrypt.compare(candidate, hash);
  } catch {
    return false;
  }
}
