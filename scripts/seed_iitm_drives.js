/**
 * seed_iitm_drives.js
 * Creates one placement drive per approved employer at IIT Madras (tenant),
 * spread across Sep 20-30, 2026.  Status is set to 'approved' directly so
 * the drives are immediately visible on the college dashboard.
 *
 * Run:  node scripts/seed_iitm_drives.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Read DATABASE_URL from .env.local ──────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const dbUrl = envText
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL='))
  ?.split('=')
  .slice(1)
  .join('=')
  .trim();

if (!dbUrl) {
  console.error('❌  DATABASE_URL not found in .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

// Drive date spread: Sep 20 – Sep 30, 2026
const START_DATE = new Date('2026-09-20');
const END_DATE   = new Date('2026-09-30');
const SPAN_DAYS  = Math.round((END_DATE - START_DATE) / 86_400_000); // 10

function spreadDate(index, total) {
  // Evenly distribute across the 10-day window; if only 1 drive, use Sep 25
  const gap = total <= 1 ? 5 : Math.round((SPAN_DAYS * index) / (total - 1));
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + Math.min(gap, SPAN_DAYS));
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

const DRIVE_TITLES = [
  'Campus Placement Drive – Technical Roles',
  'Engineering Talent Hiring Drive',
  'Graduate Recruitment Drive 2026',
  'On-Campus Placement Drive',
  'Technology & Innovation Hiring Drive',
  'Core Engineering Placement Drive',
  'Software & Systems Placement Drive',
  'Full-Stack & Backend Recruitment Drive',
  'Data & Analytics Hiring Drive',
  'Product & Platform Placement Drive',
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find IIT Madras tenant
    const tenantRes = await client.query(
      `SELECT id, name FROM tenants
       WHERE name ILIKE '%Indian Institute of Technology%Madras%'
          OR name ILIKE '%IIT%Madras%'
          OR name ILIKE '%IIT Madras%'
       LIMIT 1`
    );
    if (!tenantRes.rows.length) {
      console.error('❌  IIT Madras tenant not found. Available tenants:');
      const all = await client.query('SELECT name FROM tenants ORDER BY name');
      all.rows.forEach((r) => console.log('  •', r.name));
      await client.query('ROLLBACK');
      return;
    }
    const { id: tenantId, name: collegeName } = tenantRes.rows[0];
    console.log(`✅  Found tenant: "${collegeName}" (${tenantId})`);

    // 2. Find all employers with an approved partnership with this college
    const empRes = await client.query(
      `SELECT ep.id AS employer_id, ep.company_name
       FROM employer_approvals ea
       JOIN employer_profiles ep ON ep.id = ea.employer_id
       WHERE ea.tenant_id = $1::uuid
         AND ea.status = 'approved'
       ORDER BY ep.company_name`,
      [tenantId]
    );

    if (!empRes.rows.length) {
      console.warn('⚠️   No approved employers found for this tenant.');
      console.log('     Checking ALL employers in the system...');
      const allEmp = await client.query(
        `SELECT ep.id AS employer_id, ep.company_name
         FROM employer_profiles ep
         ORDER BY ep.company_name`
      );
      console.log(`     Found ${allEmp.rows.length} employer(s) total. Check employer_approvals table.`);
      await client.query('ROLLBACK');
      return;
    }

    console.log(`\n📋  Found ${empRes.rows.length} approved employer(s):`);
    empRes.rows.forEach((e) => console.log(`  •  ${e.company_name} (${e.employer_id})`));

    // 3. Find a college admin to set as approver
    const adminRes = await client.query(
      `SELECT id FROM users
       WHERE tenant_id = $1::uuid AND role = 'college_admin' AND is_active = true
       LIMIT 1`,
      [tenantId]
    );
    const approverId = adminRes.rows[0]?.id || null;

    // 4. Insert one drive per employer
    console.log('\n🚀  Inserting placement drives...\n');
    const inserted = [];

    for (let i = 0; i < empRes.rows.length; i++) {
      const { employer_id, company_name } = empRes.rows[i];
      const driveDate = spreadDate(i, empRes.rows.length);
      const title = `${company_name} – ${DRIVE_TITLES[i % DRIVE_TITLES.length]}`;
      const driveId = crypto.randomUUID();

      await client.query(
        `INSERT INTO placement_drives (
           id, tenant_id, employer_id, job_id, title, description,
           drive_type, drive_date, venue, status,
           max_students, registered_count, selected_count,
           approved_by, approved_at, created_at, updated_at
         ) VALUES (
           $1::uuid, $2::uuid, $3::uuid, NULL,
           $4, $5,
           'on_campus', $6::date, 'Main Auditorium, IIT Madras', 'approved',
           200, 0, 0,
           $7, NOW(), NOW(), NOW()
         )`,
        [
          driveId,
          tenantId,
          employer_id,
          title,
          `Placement drive organized by ${company_name} at IIT Madras for the academic year 2026-27. Eligible students from all branches may apply as per the eligibility criteria shared by the employer.`,
          driveDate,
          approverId,
        ]
      );

      console.log(`  ✅  [${driveDate}]  ${company_name}`);
      console.log(`         Title : ${title}`);
      console.log(`         ID    : ${driveId}\n`);
      inserted.push({ driveId, company_name, driveDate, title });
    }

    await client.query('COMMIT');
    console.log(`\n🎉  Successfully created ${inserted.length} placement drive(s) for "${collegeName}"`);
    console.log(`     Date range: Sep 20, 2026 – Sep 30, 2026`);
    console.log(`     Status    : approved (immediately visible on dashboard)\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌  Error:', err.message);
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
