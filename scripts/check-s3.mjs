#!/usr/bin/env node
import fs from 'node:fs';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

function readEnvFile(name) {
  if (!fs.existsSync(name)) return {};
  const out = {};
  for (const line of fs.readFileSync(name, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
const region = env.AWS_REGION;
const bucket = env.S3_BUCKET_NAME;
const accessKeyId = env.AWS_ACCESS_KEY_ID;
const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

if (!region || !bucket || !accessKeyId || !secretAccessKey) {
  console.log('S3 NOT CONFIGURED: missing one of AWS_REGION, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
  process.exit(1);
}

console.log(`Region: ${region}`);
console.log(`Bucket: ${bucket}`);
console.log(`Access key: ${accessKeyId.slice(0, 4)}…${accessKeyId.slice(-4)}`);

const client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
const sts = new STSClient({ region, credentials: { accessKeyId, secretAccessKey } });

try {
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  console.log('STS OK:', identity.Arn || identity.Account);
} catch (e) {
  console.log('STS FAIL:', e.name || e.Code || 'Error');
  console.log('Message:', (e.message || '').slice(0, 200));
  if (e.$metadata) console.log('HTTP:', e.$metadata.httpStatusCode);
  process.exit(1);
}

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log('S3 OK: bucket reachable with current credentials');
} catch (e) {
  console.log('S3 FAIL:', e.name || e.Code || 'Error');
  console.log('Message:', (e.message || '').slice(0, 200));
  if (e.$metadata) console.log('HTTP:', e.$metadata.httpStatusCode);
  process.exit(1);
}
