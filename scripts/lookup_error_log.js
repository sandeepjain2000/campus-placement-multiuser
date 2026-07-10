/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function readEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

async function main() {
  const ref = (process.argv[2] || '').trim().toUpperCase();
  const env = readEnvLocal();
  const url = process.env.DATABASE_URL || env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'job_postings' ORDER BY 1`,
  );
  console.log('job_postings columns:', cols.rows.map((r) => r.column_name).join(', '));

  if (ref) {
    const log = await client.query(
      `SELECT id, context, error_message, error_code, details, created_at
       FROM platform_error_logs
       WHERE UPPER(id::text) LIKE $1 OR UPPER(details::text) LIKE $1
       ORDER BY created_at DESC LIMIT 5`,
      [`%${ref}%`],
    ).catch((e) => {
      console.log('platform_error_logs query failed:', e.message);
      return { rows: [] };
    });
    console.log('\nError logs for', ref, ':', JSON.stringify(log.rows, null, 2));
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
