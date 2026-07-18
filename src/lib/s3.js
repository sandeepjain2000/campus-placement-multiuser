import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export function isS3Configured() {
  return Boolean(
    process.env.AWS_REGION
    && process.env.AWS_ACCESS_KEY_ID
    && process.env.AWS_SECRET_ACCESS_KEY
    && process.env.S3_BUCKET_NAME,
  );
}

/** User-facing hint when S3/STS rejects server credentials (common on stale Vercel env). */
export function describeStorageError(error) {
  const name = String(error?.name || error?.Code || '');
  const message = String(error?.message || '');
  if (/not configured|missing aws env/i.test(message)) {
    return 'File storage is not configured on the server. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME.';
  }
  if (
    name === 'InvalidAccessKeyId'
    || name === 'InvalidClientTokenId'
    || /access key id you provided does not exist/i.test(message)
    || /security token included in the request is invalid/i.test(message)
  ) {
    return 'File storage credentials are invalid. Update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY on the server, then try again.';
  }
  if (name === 'SignatureDoesNotMatch' || /signature we calculated does not match/i.test(message)) {
    return 'File storage credentials are misconfigured (secret key mismatch). Check AWS_SECRET_ACCESS_KEY on the server.';
  }
  if (name === 'AccessDenied' || name === 'AccessDeniedException' || /access denied/i.test(message)) {
    return 'File storage access denied. The AWS IAM user needs s3:PutObject, s3:GetObject, and s3:HeadObject on the documents bucket.';
  }
  if (
    name === 'NotFound'
    || name === 'NoSuchKey'
    || name === 'NoSuchBucket'
    || error?.$metadata?.httpStatusCode === 404
    || /nosuchkey/i.test(message)
    || /no longer available/i.test(message)
  ) {
    return 'This file is no longer available.';
  }
  if (/invalid file location/i.test(message)) {
    return 'This file location is invalid. Re-upload the CV.';
  }
  return message || 'File storage request failed';
}

/** True when the error is bad/missing AWS credentials (ops must fix env). */
export function isStorageCredentialError(error) {
  const name = String(error?.name || error?.Code || '');
  const message = String(error?.message || '');
  return (
    name === 'InvalidAccessKeyId'
    || name === 'InvalidClientTokenId'
    || name === 'SignatureDoesNotMatch'
    || /access key id you provided does not exist/i.test(message)
    || /security token included in the request is invalid/i.test(message)
    || /signature we calculated does not match/i.test(message)
    || /not configured|missing aws env/i.test(message)
  );
}

/** True when the object is missing (not a credential/config problem). */
export function isStorageMissingObjectError(error) {
  const name = String(error?.name || error?.Code || '');
  const message = String(error?.message || '');
  return (
    name === 'NotFound'
    || name === 'NoSuchKey'
    || name === 'NoSuchBucket'
    || error?.$metadata?.httpStatusCode === 404
    || /nosuchkey/i.test(message)
    || /no longer available/i.test(message)
    || /invalid file location/i.test(message)
  );
}

/** True when the object exists in the configured bucket. Missing keys return false (never throw). */
export async function s3ObjectExists(key) {
  if (!isS3Configured()) return false;
  const safeKey = String(key || '').replace(/^\/+/, '');
  if (!safeKey) return false;
  try {
    const client = getClient();
    await client.send(
      new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: safeKey,
      }),
    );
    return true;
  } catch (error) {
    const name = String(error?.name || error?.Code || '');
    const status = error?.$metadata?.httpStatusCode;
    if (name === 'NotFound' || name === 'NoSuchKey' || status === 404) return false;
    throw error;
  }
}

function getClient() {
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

export async function putObjectText({ key, body, contentType = 'text/plain; charset=utf-8' }) {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (missing AWS env vars).');
  }
  const client = getClient();
  const bucket = process.env.S3_BUCKET_NAME;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return {
    bucket,
    key,
    fileUrl: buildS3ObjectPublicUrl(bucket, process.env.AWS_REGION, key),
  };
}

/**
 * Download an object body from the configured bucket (server-side).
 * @param {string} key
 * @returns {Promise<{ buffer: Buffer, contentType: string | null }>}
 */
export async function getObjectBufferFromKey(key) {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (missing AWS env vars).');
  }
  const client = getClient();
  const bucket = process.env.S3_BUCKET_NAME;
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of out.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return {
    buffer: Buffer.concat(chunks),
    contentType: out.ContentType || null,
  };
}

export async function createDownloadUrlForKey(key, expiresInSeconds = 60 * 60 * 24 * 7, { downloadFileName, disposition, contentType } = {}) {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (missing AWS env vars).');
  }
  const client = getClient();
  const bucket = process.env.S3_BUCKET_NAME;
  const safeName = downloadFileName ? String(downloadFileName).replace(/"/g, '') : '';
  let responseContentDisposition;
  if (safeName) {
    if (disposition === 'inline') {
      responseContentDisposition = `inline; filename="${safeName}"`;
    } else {
      responseContentDisposition = `attachment; filename="${safeName}"`;
    }
  }
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(responseContentDisposition ? { ResponseContentDisposition: responseContentDisposition } : {}),
    ...(contentType ? { ResponseContentType: contentType } : {}),
  });
  const downloadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  return { bucket, key, downloadUrl, expiresIn: expiresInSeconds };
}

function sanitizeFilename(name) {
  return String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 180);
}

/**
 * Public HTTPS URL for an object (virtual-hosted–style). Fine for metadata;
 * downloads can use presigned GET later if the bucket is private.
 */
export function buildS3ObjectPublicUrl(bucket, region, key) {
  const encKey = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${encKey}`;
}

/**
 * Student documents (PDF, etc.): do **not** set ContentType on PutObject when presigning.
 * If Content-Type is part of SigV4 signed headers, browser uploads often fail (403) due to
 * case, charset, or SDK/browser drift. Objects default to binary/octet-stream; browsers still open PDFs.
 * Set S3_PRESIGN_DOCUMENT_CONTENT_TYPE=1 to restore legacy signed Content-Type behavior.
 *
 * @param {{ userId: string, fileName: string, contentType: string }} opts
 */
export async function createStudentDocumentPresign({ userId, fileName, contentType }) {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (missing AWS env vars).');
  }

  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const safe = sanitizeFilename(fileName);
  const key = `students/${userId}/${randomUUID()}-${safe}`;

  const client = getClient();
  const resolvedType = contentType || 'application/octet-stream';
  const signContentType = process.env.S3_PRESIGN_DOCUMENT_CONTENT_TYPE === '1';
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(signContentType ? { ContentType: resolvedType } : {}),
  });

  const expiresIn = parseInt(process.env.S3_PRESIGN_EXPIRES_SECONDS || '900', 10);
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  const fileUrl = buildS3ObjectPublicUrl(bucket, region, key);

  return {
    uploadUrl,
    fileUrl,
    key,
    bucket,
    expiresIn,
    contentType: signContentType ? resolvedType : null,
  };
}

/**
 * Upload a student document from the server (avoids browser→S3 CORS / presigned Content-Type drift).
 * @param {{ userId: string, fileName: string, contentType: string, body: Buffer | Uint8Array }} opts
 */
export async function uploadStudentDocumentBuffer({ userId, fileName, contentType, body }) {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (missing AWS env vars).');
  }

  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const safe = sanitizeFilename(fileName);
  const key = `students/${userId}/${randomUUID()}-${safe}`;
  const resolvedType = contentType || 'application/octet-stream';

  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: resolvedType,
    }),
  );

  const fileUrl = buildS3ObjectPublicUrl(bucket, region, key);
  return { fileUrl, key, bucket, contentType: resolvedType };
}

/**
 * Upload a student avatar from the server (avoids browser→S3 CORS issues).
 * @param {{ userId: string, fileName: string, contentType: string, body: Buffer | Uint8Array }} opts
 */
export async function uploadStudentAvatarBuffer({ userId, fileName, contentType, body }) {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (missing AWS env vars).');
  }

  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const safe = sanitizeFilename(fileName);
  const key = `students/${userId}/avatar/${randomUUID()}-${safe}`;
  const resolvedType = contentType || 'application/octet-stream';

  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: resolvedType,
    }),
  );

  const fileUrl = buildS3ObjectPublicUrl(bucket, region, key);
  return { fileUrl, key, bucket, contentType: resolvedType };
}

/**
 * Profile photo — same bucket/IAM prefix `students/{userId}/…` as documents.
 * Like documents, **omit signed Content-Type by default** so browser PUTs cannot hit
 * SigV4 SignatureDoesNotMatch (case/charset drift between presign and fetch).
 * Set S3_PRESIGN_AVATAR_CONTENT_TYPE=1 to sign Content-Type again (legacy).
 * @param {{ userId: string, fileName: string, contentType: string }} opts
 * @returns {Promise<{ uploadUrl: string, fileUrl: string, key: string, bucket: string, expiresIn: number, contentType: string | null }>}
 */
export async function createStudentAvatarPresign({ userId, fileName, contentType }) {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (missing AWS env vars).');
  }

  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const safe = sanitizeFilename(fileName);
  const key = `students/${userId}/avatar/${randomUUID()}-${safe}`;

  const resolvedType = contentType || 'application/octet-stream';
  const client = getClient();
  const signContentType = process.env.S3_PRESIGN_AVATAR_CONTENT_TYPE === '1';
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(signContentType ? { ContentType: resolvedType } : {}),
  });

  const expiresIn = parseInt(process.env.S3_PRESIGN_EXPIRES_SECONDS || '900', 10);
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  const fileUrl = buildS3ObjectPublicUrl(bucket, region, key);

  return {
    uploadUrl,
    fileUrl,
    key,
    bucket,
    expiresIn,
    contentType: signContentType ? resolvedType : null,
  };
}

async function createImagePresign({ keyPrefix, fileName, contentType }) {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (missing AWS env vars).');
  }
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;
  const safe = sanitizeFilename(fileName);
  const key = `${keyPrefix}/${randomUUID()}-${safe}`;
  const resolvedType = contentType || 'application/octet-stream';
  const client = getClient();
  const signContentType = process.env.S3_PRESIGN_AVATAR_CONTENT_TYPE === '1';
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(signContentType ? { ContentType: resolvedType } : {}),
  });
  const expiresIn = parseInt(process.env.S3_PRESIGN_EXPIRES_SECONDS || '900', 10);
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  const fileUrl = buildS3ObjectPublicUrl(bucket, region, key);
  return {
    uploadUrl,
    fileUrl,
    key,
    bucket,
    expiresIn,
    contentType: signContentType ? resolvedType : null,
  };
}

export async function createEmployerLogoPresign({ userId, fileName, contentType }) {
  return createImagePresign({ keyPrefix: `employers/${userId}/logo`, fileName, contentType });
}

export async function createTenantLogoPresign({ tenantId, fileName, contentType }) {
  return createImagePresign({ keyPrefix: `tenants/${tenantId}/logo`, fileName, contentType });
}
