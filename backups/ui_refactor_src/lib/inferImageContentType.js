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
