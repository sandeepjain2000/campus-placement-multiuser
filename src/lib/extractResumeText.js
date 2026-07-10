import { getObjectBufferFromKey, isS3Configured } from '@/lib/s3';

function extractS3Key(fileUrl) {
  try {
    const parsed = new URL(String(fileUrl || ''));
    return decodeURIComponent((parsed.pathname || '').replace(/^\/+/, '')) || null;
  } catch {
    return null;
  }
}

function guessKind(fileName, contentType) {
  const name = String(fileName || '').toLowerCase();
  const type = String(contentType || '').toLowerCase();
  if (name.endsWith('.pdf') || type.includes('pdf')) return 'pdf';
  if (name.endsWith('.docx') || type.includes('wordprocessingml')) return 'docx';
  if (name.endsWith('.doc') || type.includes('msword')) return 'doc';
  if (name.endsWith('.txt') || type.startsWith('text/')) return 'text';
  return 'unknown';
}

async function extractPdfText(buffer) {
  const mod = await import('pdf-parse');
  const pdfParse = mod.default || mod;
  const parsed = await pdfParse(buffer);
  return String(parsed?.text || '').trim();
}

async function extractDocxText(buffer) {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return String(result?.value || '').trim();
}

/**
 * Pull plain text from a résumé stored in S3.
 * @param {string} fileUrl
 * @param {string} [fileName]
 * @returns {Promise<{ ok: true, text: string, kind: string } | { ok: false, code: string, message: string, detail?: string }>}
 */
export async function extractTextFromResumeUrl(fileUrl, fileName = '') {
  if (!isS3Configured()) {
    return {
      ok: false,
      code: 's3_not_configured',
      message: 'File storage is not configured on the server, so your CV cannot be read for skill suggestions.',
    };
  }

  const key = extractS3Key(fileUrl);
  if (!key) {
    return {
      ok: false,
      code: 'invalid_resume_url',
      message: 'Your résumé file location is invalid. Re-upload your CV on your profile.',
    };
  }

  let buffer;
  let contentType = null;
  try {
    const obj = await getObjectBufferFromKey(key);
    buffer = obj.buffer;
    contentType = obj.contentType;
  } catch (e) {
    return {
      ok: false,
      code: 's3_download_failed',
      message: 'Could not download your CV from storage. Try uploading it again.',
      detail: e?.message || String(e),
    };
  }

  const kind = guessKind(fileName, contentType);

  if (kind === 'doc') {
    return {
      ok: false,
      code: 'unsupported_format',
      message: 'Old Word (.doc) files cannot be read. Save your CV as PDF or .docx and upload again.',
    };
  }

  if (kind === 'unknown') {
    return {
      ok: false,
      code: 'unsupported_format',
      message: 'Unsupported CV format. Upload a PDF, Word (.docx), or plain-text file.',
    };
  }

  try {
    let text = '';
    if (kind === 'pdf') {
      text = await extractPdfText(buffer);
    } else if (kind === 'docx') {
      text = await extractDocxText(buffer);
    } else if (kind === 'text') {
      text = buffer.toString('utf8').trim();
    }

    if (!text) {
      return {
        ok: false,
        code: 'empty_text',
        message:
          'No readable text was found in your CV. Scanned/image-only PDFs often fail — use a text-based PDF or Word file, or add skills manually.',
        kind,
      };
    }

    return { ok: true, text, kind };
  } catch (e) {
    return {
      ok: false,
      code: 'extract_failed',
      message: 'Could not read text from your CV file. Try re-saving as PDF or .docx and upload again.',
      detail: e?.message || String(e),
      kind,
    };
  }
}
