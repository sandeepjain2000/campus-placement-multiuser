import bcrypt from 'bcryptjs';
import { DEV_NOTES_PASSWORD_HASH } from '@/lib/developerNotesAuth';

export async function verifyDevNotesPassword(password) {
  const candidate = String(password || '');
  if (!candidate) return false;
  try {
    return await bcrypt.compare(candidate, DEV_NOTES_PASSWORD_HASH);
  } catch {
    return false;
  }
}
