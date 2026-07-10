/** Neutral placeholder when no logo is set or the saved URL fails to load. */
export const DEFAULT_ENTITY_LOGO_URL = '/logos/No-Selection-Icon.png';

export function isBrowserLoadableAssetUrl(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  // Windows / local filesystem paths (C:\..., C:/..., \\server\...)
  if (/^[a-zA-Z]:[\\/]/.test(s)) return false;
  if (/^\/[a-zA-Z]:/.test(s)) return false;
  if (/^[\\/]{2}/.test(s)) return false;
  if (s.includes('\\')) return false;
  if (s.startsWith('file://')) return false;
  // Unix home paths pasted as if they were site paths (/Users/..., /home/...)
  if (/^\/(?:Users|home|Downloads|Documents|Desktop)(?:\/|$)/i.test(s)) return false;
  if (s.startsWith('http://') || s.startsWith('https://')) return true;
  if (s.startsWith('/')) return true;
  return false;
}

export function isAwsS3Url(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/^https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/.+/i.test(s)) return true;
  if (/^https:\/\/s3\.[^/]+\.amazonaws\.com\/[^/]+\/.+/i.test(s)) return true;
  return false;
}

export function toSignedViewUrl(value) {
  const s = String(value || '').trim();
  if (!isBrowserLoadableAssetUrl(s)) return '';
  if (!isAwsS3Url(s)) return s;
  return `/api/s3/view?url=${encodeURIComponent(s)}`;
}

/** Safe display URL for student profile photos (S3 proxy, invalid paths → null). */
export function resolveStudentPhotoDisplayUrl(value) {
  const resolved = toSignedViewUrl(value);
  return resolved || null;
}
