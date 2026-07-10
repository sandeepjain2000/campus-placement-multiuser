/* eslint-disable no-console */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function readEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

async function main() {
  const env = readEnvLocal();
  const url =
    process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || env.DATABASE_URL || env.SUPABASE_DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const latest = await c.query(
      `SELECT created_at, context, status, subject_truncated, recipient_login_email
       FROM mail_delivery_logs ORDER BY created_at DESC LIMIT 1`,
    );
    console.log('--- latest single mail ---');
    console.log(JSON.stringify(latest.rows[0], null, 2));

    const latestMinute = latest.rows[0]?.created_at;
    if (latestMinute) {
      const batch = await c.query(
        `SELECT context, status, COUNT(*)::int AS n
         FROM mail_delivery_logs
         WHERE created_at >= date_trunc('minute', $1::timestamptz)
           AND created_at < date_trunc('minute', $1::timestamptz) + interval '1 minute'
         GROUP BY context, status
         ORDER BY n DESC`,
        [latestMinute],
      );
      const sentInBatch = batch.rows.filter((r) => r.status === 'sent').reduce((s, r) => s + r.n, 0);
      console.log('--- emails in latest minute batch ---');
      console.log(JSON.stringify({ minute: latestMinute, sent: sentInBatch, breakdown: batch.rows }, null, 2));
    }

    const onJune17 = await c.query(
      `SELECT context, status, COUNT(*)::int AS n
       FROM mail_delivery_logs
       WHERE created_at >= '2026-06-17T18:00:00Z' AND created_at < '2026-06-17T19:30:00Z'
       GROUP BY context, status ORDER BY n DESC`,
    );
    console.log('--- mail during guided run GT-2026-06-171818 window ---');
    console.log(JSON.stringify(onJune17.rows, null, 2));
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
