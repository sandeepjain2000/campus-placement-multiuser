/* eslint-disable no-console */
/**
 * Hard-delete all jobs, internships/programs, drives, dependent rows,
 * alerts, audit logs, and non-core (test) college tenants.
 *
 * Keeps seed campuses: IIT Madras, NIT Trichy, BITS Pilani, Jadavpur, VIT, DTU, IIIT-H.
 * Usage: node scripts/clear_all_placement_data.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

/** Seed / demo colleges — keep in sync with db/seed.sql + demo logins. */
const CORE_COLLEGE_SLUGS = [
  'iit-madras',
  'nit-trichy',
  'bits-pilani',
  'jadavpur-university',
  'vit-vellore',
  'dtu-delhi',
  'iiit-hyderabad',
];

const CORE_COLLEGE_IDS = [
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000007',
];

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
  ['Alerts (notifications)', 'SELECT COUNT(*)::int AS n FROM notifications'],
  ['Audit logs', 'SELECT COUNT(*)::int AS n FROM audit_logs'],
  [
    'Colleges (all)',
    `SELECT COUNT(*)::int AS n FROM tenants WHERE type = 'college'`,
  ],
  [
    'Colleges (non-core / test)',
    `SELECT COUNT(*)::int AS n FROM tenants
     WHERE type = 'college'
       AND NOT (
         slug = ANY($1::text[])
         OR id = ANY($2::uuid[])
       )`,
    true,
  ],
];

async function snapshot(client, label) {
  console.log(`\n${label}:`);
  for (const row of COUNT_QUERIES) {
    const [name, sql, needsCoreParams] = row;
    const r = needsCoreParams
      ? await client.query(sql, [CORE_COLLEGE_SLUGS, CORE_COLLEGE_IDS])
      : await client.query(sql);
    console.log(`  ${name}: ${r.rows[0].n}`);
  }
}

/**
 * Delete registration / QA college tenants that are not seed campuses.
 * Mirrors scripts/delete_test_college_tenants.py (slug-based, broader: any non-core).
 */
async function deleteNonCoreColleges(client) {
  const listed = await client.query(
    `SELECT id::text AS id, slug, name
     FROM tenants
     WHERE type = 'college'
       AND NOT (
         slug = ANY($1::text[])
         OR id = ANY($2::uuid[])
       )
     ORDER BY name`,
    [CORE_COLLEGE_SLUGS, CORE_COLLEGE_IDS],
  );

  if (!listed.rows.length) {
    console.log('\nTest colleges: none to delete (only core campuses remain).');
    return [];
  }

  console.log(`\nTest colleges to delete (${listed.rows.length}):`);
  for (const t of listed.rows) {
    console.log(`  - ${t.name} (${t.slug})`);
  }

  const tenantIds = listed.rows.map((r) => r.id);

  // Rows that can block tenant delete (ON DELETE RESTRICT / non-cascade paths)
  await client.query(
    `DELETE FROM employer_assessment_rows ear
     USING student_profiles sp
     WHERE ear.student_profile_id = sp.id
       AND sp.tenant_id = ANY($1::uuid[])`,
    [tenantIds],
  );
  await client.query(
    `DELETE FROM employer_assessment_contexts
     WHERE tenant_id = ANY($1::uuid[])`,
    [tenantIds],
  );
  await client.query(
    `DELETE FROM employer_assessment_import_sessions
     WHERE tenant_id = ANY($1::uuid[])`,
    [tenantIds],
  );
  await client.query(
    `DELETE FROM employer_assessment_uploads
     WHERE tenant_id = ANY($1::uuid[])`,
    [tenantIds],
  );

  const deleted = await client.query(
    `DELETE FROM tenants
     WHERE type = 'college'
       AND id = ANY($1::uuid[])
       AND NOT (
         slug = ANY($2::text[])
         OR id = ANY($3::uuid[])
       )
     RETURNING name, slug`,
    [tenantIds, CORE_COLLEGE_SLUGS, CORE_COLLEGE_IDS],
  );

  console.log(`Deleted ${deleted.rows.length} test college tenant(s).`);
  return deleted.rows;
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
    await deleteNonCoreColleges(client);
    await client.query('COMMIT');
    await snapshot(client, 'After');

    const remaining = await client.query(
      `SELECT name, slug FROM tenants
       WHERE type = 'college' AND COALESCE(is_active, true) = true
       ORDER BY name`,
    );
    console.log('\nRemaining colleges:');
    for (const t of remaining.rows) {
      console.log(`  - ${t.name} (${t.slug})`);
    }

    console.log('\nDone — jobs, internships/programs, drives, and dependent rows removed.');
    console.log('Alerts + Audit logs cleared (both should be 0 above).');
    console.log('Non-core / test colleges deleted; seed campuses kept.');
    console.log('Core users, students, and employers on seed campuses are unchanged.\n');
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
