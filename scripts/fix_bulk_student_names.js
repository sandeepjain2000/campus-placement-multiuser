/* eslint-disable no-console */
/**
 * Assign realistic names to IITM-BULK-* demo students (replaces "Student IITM-BULK-0001").
 * Usage: node scripts/fix_bulk_student_names.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const {
  demoBulkStudentNameParts,
  parseIitmBulkRollIndex,
  isLegacyBulkStudentName,
} = require('./lib/demoBulkStudentNames.cjs');

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
    const { rows } = await client.query(
      `SELECT u.id AS user_id, u.first_name, u.last_name, sp.roll_number
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       WHERE sp.roll_number ~ '^IITM-BULK-[0-9]+$'
       ORDER BY sp.roll_number`,
    );

    let updated = 0;
    for (const row of rows) {
      if (!isLegacyBulkStudentName(row.first_name, row.last_name, row.roll_number)) {
        continue;
      }
      const idx = parseIitmBulkRollIndex(row.roll_number);
      if (!idx) continue;
      const { firstName, lastName } = demoBulkStudentNameParts(idx);
      await client.query(
        `UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3::uuid`,
        [firstName, lastName, row.user_id],
      );
      updated += 1;
    }
    console.log(`Updated ${updated} bulk student name(s) (${rows.length} IITM-BULK rows checked).`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
