/* eslint-disable no-console */
/**
 * One-off: set CGPA to 8 where missing or zero.
 * Usage: node scripts/fix_student_cgpa_blank_zero.js
 */
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
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    out[k] = v;
  }
  return out;
}

async function main() {
  const env = readEnvLocal();
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    env.DATABASE_URL ||
    env.SUPABASE_DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or SUPABASE_DATABASE_URL required');
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(
      `UPDATE student_profiles
       SET cgpa = 8, updated_at = NOW()
       WHERE cgpa IS NULL OR cgpa = 0
       RETURNING id`,
    );
    console.log(`Updated ${result.rowCount} student profile(s) to CGPA 8.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
