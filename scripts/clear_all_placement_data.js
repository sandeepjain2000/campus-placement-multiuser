/* eslint-disable no-console */
/**
 * Hard-delete all jobs, internships/programs, drives, and dependent rows.
 * Usage: node scripts/clear_all_placement_data.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function readEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const COUNT_QUERIES = [
  ['job_postings', 'SELECT COUNT(*)::int AS n FROM job_postings'],
  ['placement_drives', 'SELECT COUNT(*)::int AS n FROM placement_drives'],
  ['program_applications', 'SELECT COUNT(*)::int AS n FROM program_applications'],
  ['applications (drives)', 'SELECT COUNT(*)::int AS n FROM applications'],
  ['job_posting_visibility', 'SELECT COUNT(*)::int AS n FROM job_posting_visibility'],
  ['offers', 'SELECT COUNT(*)::int AS n FROM offers'],
  ['employer_assessment_uploads', 'SELECT COUNT(*)::int AS n FROM employer_assessment_uploads'],
];

async function snapshot(client, label) {
  console.log(`\n${label}:`);
  for (const [name, sql] of COUNT_QUERIES) {
    const r = await client.query(sql);
    console.log(`  ${name}: ${r.rows[0].n}`);
  }
}

async function main() {
  const env = readEnvLocal();
  const url = process.env.DATABASE_URL || env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required (.env.local)');

  const sqlPath = path.join(process.cwd(), 'db/scripts/clear_all_placement_data.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await snapshot(client, 'Before');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    await snapshot(client, 'After');
    console.log('\nDone — jobs, internships/programs, drives, and dependent rows removed.');
    console.log('Tenants, users, students, and employers are unchanged.\n');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
