#!/usr/bin/env node
/**
 * Verify SMTP can reach placementhub@yopmail.com (same transport as sendMail).
 * Usage: npm run test:login-support-mail
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvLocal() {
  const p = join(root, '.env.local');
  if (!existsSync(p)) {
    console.error('Missing .env.local');
    process.exit(1);
  }
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER;
const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
const fromAddr = process.env.EMAIL_FROM || user;
const to = 'placementhub@yopmail.com';

if (!user || !pass) {
  console.error('SMTP_USER / SMTP_PASS missing in .env.local');
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

const subject = '[PlacementHub] Login support - CLI SMTP test';
const text =
  'Support request from login page (CLI test)\n\nFrom: tester@college.edu\n\nIf this appears in YOPmail, SMTP is working.';

console.log('Sending via', host, 'from', fromAddr, 'to', to);

try {
  const info = await transport.sendMail({
    from: `"placementhub" <${fromAddr}>`,
    to,
    replyTo: 'tester@college.edu',
    subject,
    text,
  });
  console.log('OK', { messageId: info.messageId, response: info.response });
  console.log('Open https://yopmail.com/wm and refresh inbox placementhub');
  process.exit(0);
} catch (e) {
  console.error('SEND FAILED:', e.message);
  if (e.response) console.error(String(e.response).slice(0, 500));
  process.exit(1);
}
