import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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

export async function createDownloadUrlForKey(key, expiresInSeconds = 60 * 60 * 24 * 7) {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured (missing AWS env vars).');
  }
  const client = getClient();
  const bucket = process.env.S3_BUCKET_NAME;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
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
