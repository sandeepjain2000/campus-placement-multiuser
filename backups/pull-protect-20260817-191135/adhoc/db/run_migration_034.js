/**
 * One-shot runner: applies db/migrations/034_sponsorship_donation_receipt.sql
 * Reads DATABASE_URL from .env.local (same as the rest of the project).
 * Safe — no DROP, no schema reset.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { REPO_ROOT } = require('../lib/repo-root');

const envPath = path.join(REPO_ROOT, '.env.local');

function readEnvLocal() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = readEnvLocal();
const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;

if (!connectionString) {
  console.error('❌  DATABASE_URL not found in .env.local');
  process.exit(1);
}

const hostHint = (connectionString.match(/@([^/?:]+)/) || [])[1] || '';
const sslLocal = ['localhost', '127.0.0.1', '::1'].includes(hostHint);
const ssl = sslLocal
  ? false
  : env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false'
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: true };

const pool = new Pool({ connectionString, ssl, connectionTimeoutMillis: 15000 });

const migrationPath = path.join(REPO_ROOT, 'db', 'migrations', '034_sponsorship_donation_receipt.sql');

async function main() {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log('Connecting to database…');
  const client = await pool.connect();
  try {
    console.log('Running 034_sponsorship_donation_receipt.sql…');
    await client.query(sql);
    console.log('✅  Migration applied successfully.');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    if (err.hint)   console.error('   Hint:  ', err.hint);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
