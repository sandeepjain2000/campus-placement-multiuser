/** Client-safe CV helpers (no database imports). */

export const CV_LABEL_MAX_LENGTH = 20;

const CV_LABEL_RE = /^[\p{L}\p{N}\s._-]+$/u;

export function extractFileExtension(fileName) {
  const base = String(fileName || '').trim();
  const m = base.match(/(\.[a-zA-Z0-9]{1,12})$/);
  if (!m) return '.pdf';
  const ext = m[1].toLowerCase();
  return ext.startsWith('.') ? ext : `.${ext}`;
}

export function sanitizeCvDownloadBaseName(label) {
  const cleaned = String(label || 'CV')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, CV_LABEL_MAX_LENGTH)
    .trim();
  return cleaned || 'CV';
}

export function buildCvDownloadFileName(label, extension) {
  const base = sanitizeCvDownloadBaseName(label);
  let ext = String(extension || '.pdf').trim().toLowerCase();
  if (!ext.startsWith('.')) ext = `.${ext}`;
  if (ext === '.' || ext.length > 13) ext = '.pdf';
  return `${base}${ext}`;
}

export function validateCvLabel(label) {
  const trimmed = String(label || '').trim();
  if (!trimmed) return { error: 'CV label is required' };
  if (trimmed.length > CV_LABEL_MAX_LENGTH) {
    return { error: `CV label must be at most ${CV_LABEL_MAX_LENGTH} characters` };
  }
  if (!CV_LABEL_RE.test(trimmed)) {
    return { error: 'CV label may only contain letters, numbers, spaces, and . _ -' };
  }
  return { label: trimmed };
}

export function mapStudentCvRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    label: row.label,
    fileSize: row.file_size != null ? Number(row.file_size) : null,
    isDefault: Boolean(row.is_default),
    archivedAt: row.archived_at || null,
    cvVerifiedAt: row.cv_verified_at || null,
    cvVerifiedBy: row.cv_verified_by ? String(row.cv_verified_by) : null,
    isVerified: Boolean(row.cv_verified_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usedOnApplications: row.used_on_applications != null ? Number(row.used_on_applications) : undefined,
  };
}
