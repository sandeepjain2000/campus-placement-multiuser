import { readUploadHeader, validateBufferContentType, validateUploadHeader } from '@/lib/fileMagicBytes';
import { formatValidationError } from '@/lib/validationErrorCode';

/** Matches `src/app/api/student/profile/avatar/presign/route.js` */
export const STUDENT_AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const PHOTO_FIELD = 'student.photo';

function photoErr(message) {
  return formatValidationError(PHOTO_FIELD, message);
}

/**
 * Browser/OS quirks: normalize before presign + Set lookup.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeStudentAvatarContentType(raw) {
  const base = String(raw || 'application/octet-stream').split(';')[0].trim().toLowerCase();
  if (base === 'image/jpg' || base === 'image/pjpeg') return 'image/jpeg';
  return base;
}

/**
 * @param {File} file
 * @returns {{ ok: true, contentType: string } | { ok: false, error: string }}
 */
export function validateStudentAvatarFile(file) {
  if (!file || typeof file !== 'object') {
    return { ok: false, error: photoErr('No file selected.') };
  }
  const contentType = normalizeStudentAvatarContentType(file.type);
  if (!ALLOWED.has(contentType)) {
    return {
      ok: false,
      error: photoErr('Please use a JPEG, PNG, WebP, or GIF image.'),
    };
  }
  if (file.size > STUDENT_AVATAR_MAX_BYTES) {
    return { ok: false, error: photoErr('Image too large (max 2MB).') };
  }
  if (file.size <= 0) {
    return { ok: false, error: photoErr('File is empty.') };
  }
  return { ok: true, contentType };
}

/**
 * @param {Uint8Array | Buffer} buffer
 * @param {string} declaredContentType
 */
export function validateStudentAvatarBuffer(buffer, declaredContentType) {
  const magic = validateBufferContentType(buffer, declaredContentType);
  if (!magic.ok) {
    return { ok: false, error: photoErr(magic.error || 'Invalid image file.') };
  }
  return { ok: true, contentType: magic.contentType };
}

/** @param {File} file */
export async function validateStudentAvatarFileAsync(file) {
  const meta = validateStudentAvatarFile(file);
  if (!meta.ok) return meta;
  const bytes = await readUploadHeader(file);
  const header = validateUploadHeader(bytes, meta.contentType);
  if (!header.ok) {
    return { ok: false, error: photoErr(header.error || 'Invalid image file.') };
  }
  return header;
}

export function studentAvatarAcceptAttr() {
  return Array.from(ALLOWED).join(',');
}
