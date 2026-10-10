const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

function readEnvLocal() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    out[key] = value;
  }
  return out;
}

const env = readEnvLocal();
const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT created_at, context, severity, status_code, user_message, details
       FROM platform_error_logs
       ORDER BY created_at DESC
       LIMIT 15`
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('Error querying:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
