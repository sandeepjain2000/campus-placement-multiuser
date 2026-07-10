/**
 * Sniff real file types from magic bytes — extensions and browser MIME types are not trusted alone.
 */

/** @typedef {Uint8Array | Buffer} ByteSlice */

const KIND_TO_CONTENT_TYPE = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const CONTENT_TYPE_LABEL = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'application/msword': 'Word (.doc)',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx)',
};

/** @param {ByteSlice} bytes */
function toUint8(bytes) {
  if (bytes instanceof Uint8Array) return bytes;
  return new Uint8Array(bytes);
}

/** @param {Uint8Array} b @param {number} offset @param {string} ascii */
function matchesAscii(b, offset, ascii) {
  if (b.length < offset + ascii.length) return false;
  for (let i = 0; i < ascii.length; i += 1) {
    if (b[offset + i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Detect file kind from leading bytes (and a small scan for PDF / DOCX markers).
 * @param {ByteSlice} bytes
 * @returns {keyof typeof KIND_TO_CONTENT_TYPE | null}
 */
export function sniffFileKind(bytes) {
  const b = toUint8(bytes);
  if (b.length < 4) return null;

  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return 'png';
  }

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'jpeg';
  }

  if (matchesAscii(b, 0, 'GIF87a') || matchesAscii(b, 0, 'GIF89a')) {
    return 'gif';
  }

  if (b.length >= 12 && matchesAscii(b, 0, 'RIFF') && matchesAscii(b, 8, 'WEBP')) {
    return 'webp';
  }

  const scan = Math.min(b.length, 1024);
  for (let i = 0; i <= scan - 4; i += 1) {
    if (b[i] === 0x25 && b[i + 1] === 0x50 && b[i + 2] === 0x44 && b[i + 3] === 0x46) {
      return 'pdf';
    }
  }

  if (
    b.length >= 8 &&
    b[0] === 0xd0 &&
    b[1] === 0xcf &&
    b[2] === 0x11 &&
    b[3] === 0xe0 &&
    b[4] === 0xa1 &&
    b[5] === 0xb1 &&
    b[6] === 0x1a &&
    b[7] === 0xe1
  ) {
    return 'doc';
  }

  if (b[0] === 0x50 && b[1] === 0x4b) {
    const zipScan = Math.min(b.length, 8192);
    let hasWord = false;
    let hasContentTypes = false;
    for (let i = 0; i <= zipScan - 5; i += 1) {
      if (matchesAscii(b, i, 'word/')) hasWord = true;
      if (matchesAscii(b, i, '[Content_Types].xml')) hasContentTypes = true;
      if (hasWord) break;
    }
    if (hasWord || hasContentTypes) return 'docx';
  }

  return null;
}

/** @param {string | null | undefined} kind */
export function contentTypeFromKind(kind) {
  if (!kind) return null;
  return KIND_TO_CONTENT_TYPE[kind] || null;
}

/** @param {string} contentType */
export function labelForContentType(contentType) {
  return CONTENT_TYPE_LABEL[contentType] || contentType;
}

export const FILE_CONTENT_MISMATCH_ERROR =
  'File content does not match its type. Renaming a file does not change its format — upload a genuine PDF, PNG, or Word document.';

/**
 * @param {ByteSlice} buffer
 * @param {string} declaredContentType
 * @returns {{ ok: true, contentType: string, kind: string } | { ok: false, error: string }}
 */
export function validateBufferContentType(buffer, declaredContentType) {
  const declared = String(declaredContentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  const kind = sniffFileKind(buffer);
  const detected = contentTypeFromKind(kind);
  if (!detected) {
    return {
      ok: false,
      error:
        'Could not verify this file. It may be corrupt, password-protected, or not a supported PDF, image, or Word document.',
    };
  }

  if (declared && declared !== 'application/octet-stream' && declared !== detected) {
    return {
      ok: false,
      error: `${FILE_CONTENT_MISMATCH_ERROR} (Expected ${labelForContentType(declared)}, but file is ${labelForContentType(detected)}.)`,
    };
  }

  return { ok: true, contentType: detected, kind };
}

const DEFAULT_HEADER_BYTES = 8192;

/**
 * Read the first bytes of a browser File/Blob for client-side checks.
 * @param {File | Blob} file
 * @param {number} [maxBytes]
 * @returns {Promise<Uint8Array>}
 */
export async function readUploadHeader(file, maxBytes = DEFAULT_HEADER_BYTES) {
  if (!file || typeof file.slice !== 'function') {
    return new Uint8Array(0);
  }
  const slice = file.slice(0, maxBytes);
  return new Uint8Array(await slice.arrayBuffer());
}

/**
 * @param {ByteSlice} header
 * @param {string} declaredContentType
 * @returns {{ ok: true, contentType: string } | { ok: false, error: string }}
 */
export function validateUploadHeader(header, declaredContentType) {
  const result = validateBufferContentType(header, declaredContentType);
  if (!result.ok) return result;
  return { ok: true, contentType: result.contentType };
}
