#!/usr/bin/env node
/**
 * Load campus-placement/.env.local and verify AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
 * using STS GetCallerIdentity (no S3 permissions required).
 *
 * Usage (from repo campus-placement/):
 *   node scripts/verify-aws-credentials.mjs
 *
 * Or rely on env already set (e.g. Vercel CLI pull):
 *   node scripts/verify-aws-credentials.mjs --no-env-file
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvLocal() {
  const p = join(root, '.env.local');
  if (!existsSync(p)) {
    console.error('Missing file:', p);
    process.exit(1);
  }
  const text = readFileSync(p, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const noEnvFile = process.argv.includes('--no-env-file');
if (!noEnvFile) loadEnvLocal();

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || 'ap-south-1';
const bucket = process.env.S3_BUCKET_NAME;

function mask(k) {
  if (!k) return '(missing)';
  if (k.length <= 8) return `${k.slice(0, 2)}…`;
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

console.log('Using region:', region);
console.log('AWS_ACCESS_KEY_ID:', mask(accessKeyId));
console.log('AWS_SECRET_ACCESS_KEY:', secretAccessKey ? '(set, length ' + secretAccessKey.length + ')' : '(missing)');
console.log('S3_BUCKET_NAME:', bucket || '(not set — optional S3 check skipped)');
console.log('');

if (!accessKeyId || !secretAccessKey) {
  console.error('Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local');
  process.exit(1);
}

const credentials = { accessKeyId, secretAccessKey };

try {
  const sts = new STSClient({ region, credentials });
  const id = await sts.send(new GetCallerIdentityCommand({}));
  console.log('STS GetCallerIdentity: OK');
  console.log('  Account:', id.Account);
  console.log('  Arn:', id.Arn);
  console.log('  UserId:', id.UserId);
} catch (e) {
  console.error('STS GetCallerIdentity: FAILED');
  console.error(' ', e.name || e.constructor?.name, e.message);
  process.exit(1);
}

if (bucket) {
  try {
    const s3 = new S3Client({ region, credentials });
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log('');
    console.log('S3 HeadBucket (' + bucket + '): OK (credentials can reach this bucket in', region + ')');
  } catch (e) {
    console.log('');
    console.warn('S3 HeadBucket (' + bucket + '):', e.name || 'Error', '-', e.message);
    console.warn('  (Your IAM user may lack s3:ListBucket on the bucket; uploads can still work if PutObject is allowed.)');
  }
}

console.log('');
console.log('If STS succeeded, this access key id + secret are valid in AWS for API calls.');
console.log('If Vercel still fails, compare these exact values to Vercel Production env (no spaces).');
