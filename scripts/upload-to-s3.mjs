#!/usr/bin/env node
/**
 * Upload a local file to your PlacementHub S3 bucket (server-side; uses env credentials).
 *
 * Usage (from campus-placement/):
 *   set AWS_ACCESS_KEY_ID=...
 *   set AWS_SECRET_ACCESS_KEY=...
 *   set S3_BUCKET_NAME=campusplacement-docs-prod-ap-south-1
 *   set AWS_REGION=ap-south-1
 *   node scripts/upload-to-s3.mjs ./my-icon.svg brand/icons/linkedin.svg
 *
 * Prints the public object URL (same pattern the app uses for metadata).
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const [, , localPath, s3KeyArg] = process.argv;
if (!localPath || !s3KeyArg) {
  console.error('Usage: node scripts/upload-to-s3.mjs <local-file> <s3-key>');
  console.error('Example: node scripts/upload-to-s3.mjs ./linkedin.svg brand/icons/linkedin.svg');
  process.exit(1);
}

const bucket = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION || 'ap-south-1';
if (!bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('Set S3_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
  process.exit(1);
}

const key = s3KeyArg.replace(/^\/+/, '');
const ext = path.extname(localPath).toLowerCase();
const CONTENT_TYPES = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
};
const ContentType = CONTENT_TYPES[ext] || 'application/octet-stream';

const body = await readFile(localPath);
const client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType,
  }),
);

const encKey = key.split('/').map(encodeURIComponent).join('/');
const url = `https://${bucket}.s3.${region}.amazonaws.com/${encKey}`;
console.log('Uploaded:', url);
