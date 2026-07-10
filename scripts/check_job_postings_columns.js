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
  const env = readEnvLocal();
  const url = process.env.DATABASE_URL || env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'job_postings'
       AND column_name IN ('is_visible', 'additional_info', 'published_at')
     ORDER BY 1`,
  );
  console.log('Columns present:', res.rows.map((r) => r.column_name));
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
