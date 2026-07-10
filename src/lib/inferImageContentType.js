import { readUploadHeader, validateUploadHeader } from '@/lib/fileMagicBytes';

/** Browsers often leave `file.type` empty (e.g. some JPEG/HEIC on Windows). */
export function inferImageContentType(file) {
  const t = (file?.type || '').toLowerCase().trim();
  if (t.startsWith('image/')) return t;
  const n = (file?.name || '').toLowerCase();
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.gif')) return 'image/gif';
  if (n.endsWith('.heic') || n.endsWith('.heif')) return 'image/heic';
  return '';
}

const LOGO_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Infer MIME from name/type, then verify bytes match (blocks extension spoofing).
 * @param {File} file
 * @returns {Promise<{ ok: true, contentType: string } | { ok: false, error: string }>}
 */
export async function validateImageFileContent(file) {
  const declared = inferImageContentType(file);
  if (!declared || !LOGO_IMAGE_TYPES.has(declared)) {
    return { ok: false, error: 'Use a JPEG, PNG, WebP, or GIF image.' };
  }
  if (!file?.size || file.size <= 0) {
    return { ok: false, error: 'File is empty.' };
  }
  const bytes = await readUploadHeader(file);
  const check = validateUploadHeader(bytes, declared);
  if (!check.ok) return check;
  return { ok: true, contentType: check.contentType };
}
