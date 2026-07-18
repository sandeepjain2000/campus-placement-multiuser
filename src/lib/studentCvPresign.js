import { buildCvDownloadFileName } from '@/lib/studentCvShared';
import {
  createDownloadUrlForKey,
  describeStorageError,
  isS3Configured,
  isStorageCredentialError,
  isStorageMissingObjectError,
  s3ObjectExists,
} from '@/lib/s3';
import { CV_SYSTEM_ERROR_CODES } from '@/lib/cvSystemErrorCodes';

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
 * Classify a CV storage failure for API responses / Error logs.
 * @returns {{ message: string, errorCode: string, status: number, gone: boolean }}
 */
export function classifyCvStorageFailure(error) {
  const message = describeStorageError(error);
  const rawMessage = String(error?.message || '');

  // Missing object first — independent of whether env looks configured in tests/local.
  if (
    isStorageMissingObjectError(error)
    || /no longer available|invalid file location/i.test(rawMessage)
    || error?.code === CV_SYSTEM_ERROR_CODES.S3_MISSING
  ) {
    return {
      message: 'This file is no longer available. Re-upload the CV to replace it.',
      errorCode: CV_SYSTEM_ERROR_CODES.S3_MISSING,
      status: 410,
      gone: true,
    };
  }

  if (
    !isS3Configured()
    || /not configured/i.test(message)
    || isStorageCredentialError(error)
    || error?.code === CV_SYSTEM_ERROR_CODES.S3_CONFIG
  ) {
    return {
      message,
      errorCode: CV_SYSTEM_ERROR_CODES.S3_CONFIG,
      status: 503,
      gone: false,
    };
  }

  if (/access denied/i.test(message) || error?.code === CV_SYSTEM_ERROR_CODES.S3_ACCESS) {
    return {
      message,
      errorCode: CV_SYSTEM_ERROR_CODES.S3_ACCESS,
      status: 503,
      gone: false,
    };
  }

  return {
    message: message || 'Could not open this CV right now. Try again in a moment.',
    errorCode: CV_SYSTEM_ERROR_CODES.S3_ERROR,
    status: 503,
    gone: false,
  };
}

/**
 * Presign a labelled CV file for inline preview or attachment download.
 * Distinguishes missing objects from AWS credential / IAM problems.
 * @param {{ fileUrl: string, label?: string | null, fileExtension?: string | null, mode?: 'view' | 'download' }} opts
 */
export async function presignStudentCvFile({
  fileUrl,
  label,
  fileExtension,
  mode = 'view',
}) {
  if (!isS3Configured()) {
    const err = new Error('File storage not configured');
    err.code = CV_SYSTEM_ERROR_CODES.S3_CONFIG;
    throw err;
  }
  const key = extractS3KeyFromFileUrl(fileUrl);
  if (!key) {
    const err = new Error('Invalid file location');
    err.code = CV_SYSTEM_ERROR_CODES.S3_MISSING;
    throw err;
  }

  // HeadObject may be denied while GetObject is allowed — only treat clear 404 as missing.
  let exists = true;
  try {
    exists = await s3ObjectExists(key);
  } catch (error) {
    if (isStorageCredentialError(error)) {
      const err = new Error(describeStorageError(error));
      err.code = CV_SYSTEM_ERROR_CODES.S3_CONFIG;
      err.cause = error;
      throw err;
    }
    // AccessDenied on HeadObject: proceed and let GetObject/presign decide.
    exists = true;
  }
  if (!exists) {
    const err = new Error('This file is no longer available.');
    err.code = CV_SYSTEM_ERROR_CODES.S3_MISSING;
    throw err;
  }

  try {
    const downloadFileName = buildCvDownloadFileName(label, fileExtension);
    const disposition = mode === 'download' ? 'attachment' : 'inline';
    const contentType = disposition === 'inline' ? guessCvContentType(fileExtension) : null;
    return await createDownloadUrlForKey(key, 60 * 30, {
      downloadFileName,
      disposition,
      contentType,
    });
  } catch (error) {
    const classified = classifyCvStorageFailure(error);
    const err = new Error(classified.message);
    err.code = classified.errorCode;
    err.cause = error;
    throw err;
  }
}

/**
 * Presign a legacy resume URL (profile/documents) without labelled CV metadata.
 * @param {{ fileUrl: string, fileName?: string | null, mode?: 'view' | 'download' }} opts
 */
export async function presignLegacyResumeFile({ fileUrl, fileName, mode = 'view' }) {
  return presignStudentCvFile({
    fileUrl,
    label: fileName || 'resume',
    fileExtension: String(fileName || '').includes('.')
      ? String(fileName).slice(String(fileName).lastIndexOf('.'))
      : '.pdf',
    mode,
  });
}
