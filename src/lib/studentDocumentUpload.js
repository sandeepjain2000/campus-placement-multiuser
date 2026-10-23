import {
  readUploadHeader,
  validateBufferContentType,
  validateUploadHeader,
} from '@/lib/fileMagicBytes';

export { validateUploadHeader };

export const STUDENT_DOCUMENT_ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const STUDENT_DOCUMENT_EXT_TO_TYPE = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export const STUDENT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * @param {string} contentType
 * @param {string} fileName
 */
export function normalizeStudentDocumentContentType(contentType, fileName) {
  const raw = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (raw && raw !== 'application/octet-stream' && STUDENT_DOCUMENT_ALLOWED_TYPES.has(raw)) {
    return raw;
  }
  const ext = String(fileName || '').split('.').pop()?.toLowerCase();
  if (ext && STUDENT_DOCUMENT_EXT_TO_TYPE[ext]) {
    return STUDENT_DOCUMENT_EXT_TO_TYPE[ext];
  }
  return raw || 'application/octet-stream';
}

/**
 * @param {{ name?: string, type?: string, size?: number }} file
 */
export function validateStudentDocumentFile(file) {
  const fileName = String(file?.name || 'document').trim() || 'document';
  const size = Number(file?.size || 0);
  const contentType = normalizeStudentDocumentContentType(file?.type, fileName);

  if (!size) {
    return { ok: false, error: 'The file is empty. Choose a PDF or Word document.' };
  }
  if (size > STUDENT_DOCUMENT_MAX_BYTES) {
    return {
      ok: false,
      error: `File is too large (max ${Math.round(STUDENT_DOCUMENT_MAX_BYTES / (1024 * 1024))}MB).`,
    };
  }
  if (!STUDENT_DOCUMENT_ALLOWED_TYPES.has(contentType)) {
    return {
      ok: false,
      error: 'Unsupported file type. Upload a PDF or Word document (.pdf, .doc, .docx).',
    };
  }

  return { ok: true, fileName, contentType, size };
}

/**
 * Server-side: verify file bytes match declared MIME (after metadata validation).
 * @param {Uint8Array | Buffer} buffer
 * @param {{ fileName?: string, contentType: string, size?: number }} meta
 */
export function validateStudentDocumentBuffer(buffer, meta) {
  const magic = validateBufferContentType(buffer, meta.contentType);
  if (!magic.ok) return magic;
  return {
    ok: true,
    fileName: meta.fileName,
    contentType: magic.contentType,
    size: meta.size,
  };
}

/**
 * Client-side: metadata + magic-byte check before upload.
 * @param {File} file
 * @param {string} [documentType]
 */
export async function validateStudentDocumentFileForTypeAsync(file, documentType) {
  const meta = validateStudentDocumentFileForType(file, documentType);
  if (!meta.ok) return meta;
  const bytes = await readUploadHeader(file);
  const header = validateUploadHeader(bytes, meta.contentType);
  if (!header.ok) return header;
  return { ok: true, fileName: meta.fileName, contentType: header.contentType, size: meta.size };
}

export const STUDENT_DOCUMENT_ACCEPT_ATTR =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Primary résumé / CV on profile — PDF and Word only (UI: up to 5 MB). */
export const STUDENT_RESUME_MAX_BYTES = 5 * 1024 * 1024;

export const STUDENT_RESUME_ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const STUDENT_RESUME_EXT_TO_TYPE = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export const STUDENT_RESUME_ACCEPT_ATTR =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const STUDENT_RESUME_VALIDATION_ERROR =
  'CV must be a PDF or Word document (.pdf, .doc, .docx, max 5MB). Images such as PNG are not accepted.';

/** @param {string} documentType */
export function isResumeDocumentType(documentType) {
  return String(documentType || '').trim().toLowerCase() === 'resume';
}

/**
 * Validate upload by document type — résumé/CV rejects images (PNG, JPEG, etc.).
 * @param {{ name?: string, type?: string, size?: number }} file
 * @param {string} [documentType]
 */
export function validateStudentDocumentFileForType(file, documentType) {
  if (isResumeDocumentType(documentType)) {
    return validateStudentResumeFile(file);
  }
  return validateStudentDocumentFile(file);
}

/**
 * Client-side validation for primary résumé upload (profile / replace CV).
 * @param {{ name?: string, type?: string, size?: number }} file
 */
const RESUME_DISGUISED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'exe', 'js', 'mjs', 'html', 'htm', 'svg',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'bat', 'cmd', 'com',
  'scr', 'msi', 'php', 'asp', 'aspx', 'jar', 'vbs', 'ps1',
]);

export function validateStudentResumeFile(file) {
  const fileName = String(file?.name || '').trim() || 'document';
  const size = Number(file?.size || 0);
  const segments = fileName.split('.');
  const ext = segments.length > 1 ? segments[segments.length - 1].toLowerCase() : '';
  const earlierExtensions = segments.slice(0, -1).slice(1);
  const extType = STUDENT_RESUME_EXT_TO_TYPE[ext] || '';
  const disguised = earlierExtensions.some((part) => RESUME_DISGUISED_EXTENSIONS.has(part.toLowerCase()));
  if (!extType || disguised) {
    return { ok: false, error: STUDENT_RESUME_VALIDATION_ERROR };
  }
  const rawType = String(file?.type || '').split(';')[0].trim().toLowerCase();
  if (rawType.startsWith('image/')) {
    return { ok: false, error: STUDENT_RESUME_VALIDATION_ERROR };
  }
  if (rawType && rawType !== 'application/octet-stream' && rawType !== extType) {
    return { ok: false, error: STUDENT_RESUME_VALIDATION_ERROR };
  }
  if (!size || size > STUDENT_RESUME_MAX_BYTES) {
    return { ok: false, error: STUDENT_RESUME_VALIDATION_ERROR };
  }

  return { ok: true, fileName, contentType: extType, size };
}

/** Client-side résumé validation including magic-byte check. */
export async function validateStudentResumeFileAsync(file) {
  return validateStudentDocumentFileForTypeAsync(file, 'resume');
}
