/* eslint-disable no-console */
const path = require('path');
const { Client } = require('pg');
const fs = require('fs');

function readEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
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

const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local') };
const url = process.env.DATABASE_URL || env.DATABASE_URL;

async function main() {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const r = await client.query(
      `SELECT created_at, status_code, error_message, error_code, user_message, details
       FROM platform_error_logs
       WHERE context ILIKE '%student_cvs%' OR context ILIKE '%api_student_cvs%'
       ORDER BY created_at DESC
       LIMIT 15`,
    );
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.log('platform_error_logs:', e.message);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
