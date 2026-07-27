/* eslint-disable no-console */
/**
 * Hard-delete all jobs, internships/programs, drives, dependent rows,
 * sponsorship/startup-funding payment transactions, alerts, audit logs,
 * mail delivery / error / support / feedback / feature-idea / rollover logs,
 * non-core (test) college tenants, and tester-created students.
 *
 * Keeps:
 *   - Seed campuses: IIT Madras, NIT Trichy, BITS Pilani, Jadavpur, VIT, DTU, IIIT-H
 *   - Core demo students/alumni from /demo-accounts (Arjun, Sneha, Rohan, Priya alumni)
 *   - Sponsorship / startup-funding opportunity catalogs (tiers) — only payments cleared
 *
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

/**
 * Core demo students + alumni shown on /demo-accounts.
 * Keep in sync with src/lib/demoLogins.js + scripts/restore_demo_account_names.js.
 */
const CORE_DEMO_STUDENT_EMAILS = [
  'arjun.verma@iitm.edu',
  'sneha.rao@nitt.edu',
  'rohan.mehta@bits.edu',
  'priya.sharma.alumni@iitm.edu',
];

/** Seed user ids for the same four accounts (email-change safety net). */
const CORE_DEMO_STUDENT_USER_IDS = [
  'b1000000-0000-0000-0000-000000000007', // Arjun Verma
  'b1000000-0000-0000-0000-000000000015', // Sneha Rao
  'b1000000-0000-0000-0000-000000000016', // Rohan Mehta
  'b1000000-0000-0000-0000-000000000099', // Priya Sharma (alumni)
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
  ['sponsorship_payments', 'SELECT COUNT(*)::int AS n FROM sponsorship_payments'],
  ['startup_funding_payments', 'SELECT COUNT(*)::int AS n FROM startup_funding_payments'],
  ['Alerts (notifications)', 'SELECT COUNT(*)::int AS n FROM notifications'],
  ['Audit logs', 'SELECT COUNT(*)::int AS n FROM audit_logs'],
  ['mail_delivery_logs', 'SELECT COUNT(*)::int AS n FROM mail_delivery_logs'],
  ['platform_error_logs', 'SELECT COUNT(*)::int AS n FROM platform_error_logs'],
  ['login_support_messages', 'SELECT COUNT(*)::int AS n FROM login_support_messages'],
  ['platform_feedback', 'SELECT COUNT(*)::int AS n FROM platform_feedback'],
  ['feature_ideas', 'SELECT COUNT(*)::int AS n FROM feature_ideas'],
  ['semester_rollover_runs', 'SELECT COUNT(*)::int AS n FROM tenant_semester_rollover_runs'],
  [
    'calendar imported (source_uid)',
    `SELECT COUNT(*)::int AS n FROM college_calendar
     WHERE source_uid IS NOT NULL AND length(btrim(source_uid)) > 0`,
  ],
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
  ['Student profiles (all)', 'SELECT COUNT(*)::int AS n FROM student_profiles'],
  [
    'Student profiles (non-core / tester)',
    `SELECT COUNT(*)::int AS n
     FROM student_profiles sp
     LEFT JOIN users u ON u.id = sp.user_id
     WHERE NOT (
       LOWER(COALESCE(u.email, '')) = ANY($1::text[])
       OR sp.user_id = ANY($2::uuid[])
     )`,
    'students',
  ],
];


async function snapshot(client, label) {
  console.log(`\n${label}:`);
  const coreEmails = CORE_DEMO_STUDENT_EMAILS.map((e) => e.toLowerCase());
  for (const row of COUNT_QUERIES) {
    const [name, sql, paramMode] = row;
    try {
      let r;
      if (paramMode === true) {
        r = await client.query(sql, [CORE_COLLEGE_SLUGS, CORE_COLLEGE_IDS]);
      } else if (paramMode === 'students') {
        r = await client.query(sql, [coreEmails, CORE_DEMO_STUDENT_USER_IDS]);
      } else {
        r = await client.query(sql);
      }
      console.log(`  ${name}: ${r.rows[0].n}`);
    } catch (e) {
      if (e.code === '42P01') {
        console.log(`  ${name}: (table missing)`);
        continue;
      }
      throw e;
    }
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

/**
 * Hard-delete tester-created students (and orphan student logins).
 * Keeps only core demo students/alumni from /demo-accounts.
 */
async function deleteNonCoreStudents(client) {
  const coreEmails = CORE_DEMO_STUDENT_EMAILS.map((e) => e.toLowerCase());

  const listed = await client.query(
    `SELECT sp.id::text AS profile_id,
            sp.user_id::text AS user_id,
            COALESCE(u.email, '(no email)') AS email,
            TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name,
            COALESCE(sp.roll_number, '') AS roll_number,
            COALESCE(t.slug, '') AS campus
     FROM student_profiles sp
     LEFT JOIN users u ON u.id = sp.user_id
     LEFT JOIN tenants t ON t.id = sp.tenant_id
     WHERE NOT (
       LOWER(COALESCE(u.email, '')) = ANY($1::text[])
       OR sp.user_id = ANY($2::uuid[])
     )
     ORDER BY t.slug NULLS LAST, u.email NULLS LAST, sp.roll_number`,
    [coreEmails, CORE_DEMO_STUDENT_USER_IDS],
  );

  const orphanUsers = await client.query(
    `SELECT u.id::text AS user_id, u.email
     FROM users u
     WHERE u.role = 'student'
       AND LOWER(COALESCE(u.email, '')) <> ALL($1::text[])
       AND u.id <> ALL($2::uuid[])
       AND NOT EXISTS (
         SELECT 1 FROM student_profiles sp WHERE sp.user_id = u.id
       )
     ORDER BY u.email`,
    [coreEmails, CORE_DEMO_STUDENT_USER_IDS],
  );

  if (!listed.rows.length && !orphanUsers.rows.length) {
    console.log('\nTester students: none to delete (only core demo students/alumni remain).');
    return { profiles: 0, users: 0 };
  }

  console.log('\nProtected core demo student/alumni emails:');
  for (const email of CORE_DEMO_STUDENT_EMAILS) {
    console.log(`  + ${email}`);
  }

  if (listed.rows.length) {
    console.log(`\nStudent profiles to delete (${listed.rows.length}):`);
    const preview = listed.rows.slice(0, 25);
    for (const row of preview) {
      console.log(
        `  - ${row.name || '(unnamed)'} <${row.email}> roll=${row.roll_number || '—'} (${row.campus || '—'})`,
      );
    }
    if (listed.rows.length > preview.length) {
      console.log(`  … and ${listed.rows.length - preview.length} more`);
    }
  }

  if (orphanUsers.rows.length) {
    console.log(`\nOrphan student logins to delete (${orphanUsers.rows.length}):`);
    for (const row of orphanUsers.rows.slice(0, 15)) {
      console.log(`  - ${row.email} (${row.user_id})`);
    }
    if (orphanUsers.rows.length > 15) {
      console.log(`  … and ${orphanUsers.rows.length - 15} more`);
    }
  }

  const profileIds = listed.rows.map((r) => r.profile_id);
  const userIds = [
    ...new Set([
      ...listed.rows.map((r) => r.user_id).filter(Boolean),
      ...orphanUsers.rows.map((r) => r.user_id),
    ]),
  ];

  // RESTRICT / leftover refs (placement SQL already cleared most pipeline rows)
  if (profileIds.length) {
    await client.query(
      `DELETE FROM employer_assessment_rows WHERE student_profile_id = ANY($1::uuid[])`,
      [profileIds],
    );
  }

  if (userIds.length) {
    await client.query(`DELETE FROM marketplace_orders WHERE buyer_user_id = ANY($1::uuid[])`, [
      userIds,
    ]);
    // Clear NO ACTION pointers that can block user delete (nullable columns only)
    await client.query(
      `UPDATE student_profiles SET verified_by = NULL WHERE verified_by = ANY($1::uuid[])`,
      [userIds],
    );
    await client.query(
      `UPDATE student_profiles SET archived_by = NULL WHERE archived_by = ANY($1::uuid[])`,
      [userIds],
    );
    await client.query(
      `UPDATE student_cvs SET cv_verified_by = NULL WHERE cv_verified_by = ANY($1::uuid[])`,
      [userIds],
    );
  }

  let deletedProfiles = 0;
  if (profileIds.length) {
    const delProfiles = await client.query(
      `DELETE FROM student_profiles WHERE id = ANY($1::uuid[]) RETURNING id`,
      [profileIds],
    );
    deletedProfiles = delProfiles.rowCount;
  }

  let deletedUsers = 0;
  if (userIds.length) {
    const delUsers = await client.query(
      `DELETE FROM users
       WHERE id = ANY($1::uuid[])
         AND id <> ALL($2::uuid[])
         AND LOWER(COALESCE(email, '')) <> ALL($3::text[])
       RETURNING id, email`,
      [userIds, CORE_DEMO_STUDENT_USER_IDS, coreEmails],
    );
    deletedUsers = delUsers.rowCount;
  }

  console.log(`Deleted ${deletedProfiles} student profile(s) and ${deletedUsers} student user(s).`);
  return { profiles: deletedProfiles, users: deletedUsers };
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
    await deleteNonCoreStudents(client);
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

    const remainingStudents = await client.query(
      `SELECT TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name,
              u.email,
              COALESCE(t.slug, '') AS campus
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       LEFT JOIN tenants t ON t.id = sp.tenant_id
       ORDER BY t.slug, u.email`,
    );
    console.log(`\nRemaining students/alumni (${remainingStudents.rows.length}):`);
    for (const s of remainingStudents.rows) {
      console.log(`  - ${s.name} <${s.email}> (${s.campus || '—'})`);
    }

    console.log('\nDone — jobs, internships/programs, drives, and dependent rows removed.');
    console.log('Sponsorship + startup-funding payment transactions cleared (opportunity catalogs kept).');
    console.log('Alerts + Audit logs cleared (both should be 0 above).');
    console.log('Mail logs, error logs, support messages, feedback, feature ideas, rollover runs cleared.');
    console.log('Imported calendar events (source_uid) cleared; manual calendar rows kept.');
    console.log('Non-core / test colleges deleted; seed campuses kept.');
    console.log('Tester-created students deleted; only core demo students/alumni remain.');
    console.log('Core college/employer logins on seed campuses are unchanged.\n');
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
