import { buildCvDownloadFileName } from '@/lib/studentCvShared';
import { createDownloadUrlForKey, isS3Configured, s3ObjectExists } from '@/lib/s3';

export function extractS3KeyFromFileUrl(fileUrl) {
  try {
    const u = new URL(String(fileUrl || ''));
    const key = decodeURIComponent((u.pathname || '').replace(/^\/+/, ''));
    return key || null;
  } catch {
    return null;
  }
}

/** @param {string | null | undefined} fileExtension */
export function guessCvContentType(fileExtension) {
  const ext = String(fileExtension || '')
    .toLowerCase()
    .replace(/^\./, '');
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return null;
}

/** @param {import('next/server').NextRequest | Request | null | undefined} request */
export function isCvDownloadRequest(request) {
  try {
    if (!request?.url) return false;
    return new URL(request.url).searchParams.get('download') === '1';
  } catch {
    return false;
  }
}

/**
 * Presign a labelled CV file for inline preview or attachment download.
 * @param {{ fileUrl: string, label?: string | null, fileExtension?: string | null, mode?: 'view' | 'download' }} opts
 */
export async function presignStudentCvFile({
  fileUrl,
  label,
  fileExtension,
  mode = 'view',
}) {
  if (!isS3Configured()) {
    throw new Error('File storage not configured');
  }
  const key = extractS3KeyFromFileUrl(fileUrl);
  if (!key) {
    throw new Error('Invalid file location');
  }
  if (!(await s3ObjectExists(key))) {
    throw new Error('This file is no longer available.');
  }
  const downloadFileName = buildCvDownloadFileName(label, fileExtension);
  const disposition = mode === 'download' ? 'attachment' : 'inline';
  const contentType = disposition === 'inline' ? guessCvContentType(fileExtension) : null;
  return createDownloadUrlForKey(key, 60 * 30, {
    downloadFileName,
    disposition,
    contentType,
  });
}

/**
 * Presign a legacy resume URL (profile/documents) without labelled CV metadata.
 * @param {{ fileUrl: string, fileName?: string | null, mode?: 'view' | 'download' }} opts
 */
export async function presignLegacyResumeFile({ fileUrl, fileName, mode = 'view' }) {
  if (!isS3Configured()) {
    throw new Error('File storage not configured');
  }
  const key = extractS3KeyFromFileUrl(fileUrl);
  if (!key) {
    throw new Error('Invalid file location');
  }
  if (!(await s3ObjectExists(key))) {
    throw new Error('This file is no longer available.');
  }
  const safeName = String(fileName || 'resume.pdf').replace(/"/g, '');
  const ext = safeName.includes('.') ? safeName.slice(safeName.lastIndexOf('.')) : '.pdf';
  const disposition = mode === 'download' ? 'attachment' : 'inline';
  return createDownloadUrlForKey(key, 60 * 30, {
    downloadFileName: safeName,
    disposition,
    contentType: disposition === 'inline' ? guessCvContentType(ext) : null,
  });
}
