/* eslint-disable no-console */
/**
 * Demo employer assessment uploads for college Hiring Assessment screen.
 *
 * Usage:
 *   npm run seed:college-hiring-assessment-demo
 *   TENANT_ID=<uuid> npm run seed:college-hiring-assessment-demo
 */
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { Client } = require('pg');

const DEMO_FILE = '[Demo] hiring-assessment.csv';
const ROUND_LABELS = ['Online Aptitude', 'Coding', 'Technical Interview', 'HR', 'Manager'];
const ROUND_OUTCOMES = [
  ['Pass', 'Pass', 'Shortlisted', '', ''],
  ['Pass', 'Fail', '', '', ''],
  ['Pass', 'Pass', 'Pass', 'Pass', 'Selected'],
  ['Pass', 'Pass', 'In progress', '', ''],
  ['Fail', '', '', '', ''],
  ['Pass', 'Pass', 'Pass', '', ''],
  ['Pass', 'Scheduled', '', '', ''],
  ['Pass', 'Pass', 'Rejected', '', 'Panel decision pending'],
];

function readEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    out[k] = v;
  }
  return out;
}

function getDbConfig() {
  const env = readEnvLocal();
  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    env.DATABASE_URL ||
    env.SUPABASE_DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL or SUPABASE_DATABASE_URL is required (.env.local supported).');
  }
  return { connectionString: rawUrl, ssl: { rejectUnauthorized: false } };
}

async function hasArchivedColumn(client) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'student_profiles' AND column_name = 'archived_at'`,
  );
  return r.rowCount > 0;
}

async function listCollegeTenants(client, tenantIdFilter) {
  if (tenantIdFilter) {
    const r = await client.query(
      `SELECT id, name FROM tenants WHERE id = $1::uuid AND type = 'college'`,
      [tenantIdFilter],
    );
    return r.rows;
  }
  const r = await client.query(`SELECT id, name FROM tenants WHERE type = 'college' ORDER BY name`);
  return r.rows;
}

async function resolveEmployerContext(client, tenantId) {
  const drive = await client.query(
    `SELECT d.employer_id, d.id AS drive_id, d.job_id
     FROM placement_drives d
     WHERE d.tenant_id = $1::uuid AND d.employer_id IS NOT NULL
     ORDER BY d.drive_date DESC NULLS LAST, d.created_at DESC
     LIMIT 1`,
    [tenantId],
  );
  if (drive.rows[0]) {
    const { employer_id: employerId, drive_id: driveId, job_id: jobId } = drive.rows[0];
    return { employerId, driveId, jobId: null };
  }

  const job = await client.query(
    `SELECT jp.id AS job_id, jp.employer_id
     FROM job_posting_visibility jpv
     INNER JOIN job_postings jp ON jp.id = jpv.job_id
     WHERE jpv.tenant_id = $1::uuid AND jp.status = 'published'
     ORDER BY jp.created_at DESC NULLS LAST
     LIMIT 1`,
    [tenantId],
  );
  if (job.rows[0]) {
    return { employerId: job.rows[0].employer_id, driveId: null, jobId: job.rows[0].job_id };
  }

  return null;
}

async function resolveUploadedBy(client, employerId) {
  const r = await client.query(
    `SELECT u.id FROM users u
     INNER JOIN employer_profiles ep ON ep.user_id = u.id
     WHERE ep.id = $1::uuid
     LIMIT 1`,
    [employerId],
  );
  return r.rows[0]?.id || null;
}

async function loadStudents(client, tenantId, archivedFilter) {
  const r = await client.query(
    `SELECT sp.id, sp.roll_number
     FROM student_profiles sp
     WHERE sp.tenant_id = $1::uuid
       AND sp.roll_number IS NOT NULL
       AND TRIM(sp.roll_number) <> ''
       ${archivedFilter}
     ORDER BY sp.roll_number
     LIMIT 8`,
    [tenantId],
  );
  return r.rows;
}

async function findApplication(client, studentId, driveId) {
  if (!driveId) return null;
  const r = await client.query(
    `SELECT id FROM applications WHERE student_id = $1::uuid AND drive_id = $2::uuid LIMIT 1`,
    [studentId, driveId],
  );
  return r.rows[0]?.id || null;
}

async function clearDemoUploads(client, tenantId) {
  await client.query(
    `DELETE FROM employer_assessment_uploads
     WHERE tenant_id = $1::uuid AND original_file_name = $2`,
    [tenantId, DEMO_FILE],
  );
}

async function seedTenant(client, tenant, archivedFilter) {
  await clearDemoUploads(client, tenant.id);

  const ctx = await resolveEmployerContext(client, tenant.id);
  if (!ctx) {
    console.warn(`  [skip] ${tenant.name}: no employer drive or visible job for assessment context`);
    return { rows: 0 };
  }

  const students = await loadStudents(client, tenant.id, archivedFilter);
  if (!students.length) {
    console.warn(`  [skip] ${tenant.name}: no students with roll numbers`);
    return { rows: 0 };
  }

  const uploadedBy = await resolveUploadedBy(client, ctx.employerId);
  const uploadId = randomUUID();
  const accepted = students.length;

  await client.query(
    `INSERT INTO employer_assessment_uploads (
       id, employer_id, tenant_id, drive_id, job_id, uploaded_by,
       original_file_name, s3_key, total_rows, accepted_rows, rejected_rows, created_at
     ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid,
       $7, NULL, $8, $8, 0, NOW() - INTERVAL '1 day')`,
    [
      uploadId,
      ctx.employerId,
      tenant.id,
      ctx.driveId,
      ctx.jobId,
      uploadedBy,
      DEMO_FILE,
      accepted,
    ],
  );

  for (let i = 0; i < ROUND_LABELS.length; i += 1) {
    await client.query(
      `INSERT INTO employer_assessment_rounds (upload_id, round_no, round_label)
       VALUES ($1::uuid, $2, $3)
       ON CONFLICT (upload_id, round_no) DO UPDATE SET round_label = EXCLUDED.round_label`,
      [uploadId, i + 1, ROUND_LABELS[i]],
    );
  }

  let rowCount = 0;
  for (let i = 0; i < students.length; i += 1) {
    const student = students[i];
    const outcomes = ROUND_OUTCOMES[i % ROUND_OUTCOMES.length];
    const applicationId = await findApplication(client, student.id, ctx.driveId);

    await client.query(
      `INSERT INTO employer_assessment_rows (
         id, upload_id, student_profile_id, application_id, roll_number,
         is_unregistered_student, round_1_result, round_2_result, round_3_result,
         round_4_result, round_5_result, remarks
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, false,
         $6, $7, $8, $9, $10, $11)
       ON CONFLICT (upload_id, student_profile_id) DO UPDATE SET
         round_1_result = EXCLUDED.round_1_result,
         round_2_result = EXCLUDED.round_2_result,
         round_3_result = EXCLUDED.round_3_result,
         round_4_result = EXCLUDED.round_4_result,
         round_5_result = EXCLUDED.round_5_result,
         remarks = EXCLUDED.remarks`,
      [
        randomUUID(),
        uploadId,
        student.id,
        applicationId,
        student.roll_number,
        outcomes[0] || null,
        outcomes[1] || null,
        outcomes[2] || null,
        outcomes[3] || null,
        outcomes[4] || null,
        'Demo seed for college Hiring Assessment (safe to delete).',
      ],
    );
    rowCount += 1;
  }

  const visible = await client.query(
    `SELECT COUNT(*)::int AS n FROM employer_assessment_rows ear
     JOIN employer_assessment_uploads eau ON eau.id = ear.upload_id
     WHERE eau.tenant_id = $1::uuid`,
    [tenant.id],
  );

  console.log(
    `  ${tenant.name}: ${rowCount} students in demo upload (${visible.rows[0]?.n || 0} total assessment rows for tenant)`,
  );
  return { rows: rowCount };
}

async function main() {
  const tenantFilter = process.env.TENANT_ID || process.argv[2] || null;
  const client = new Client(getDbConfig());
  await client.connect();

  try {
    const hasArchive = await hasArchivedColumn(client);
    const archivedFilter = hasArchive ? 'AND sp.archived_at IS NULL' : '';
    const tenants = await listCollegeTenants(client, tenantFilter);
    if (!tenants.length) {
      throw new Error(tenantFilter ? `College tenant not found: ${tenantFilter}` : 'No college tenants found');
    }

    const tables = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'employer_assessment_uploads'`,
    );
    if (!tables.rowCount) {
      throw new Error('employer_assessment_uploads table missing. Run migration 013_audit_exports_and_assessment_uploads.sql');
    }

    console.log(`Seeding hiring assessment demos for ${tenants.length} tenant(s)…`);
    await client.query('BEGIN');

    let total = 0;
    for (const tenant of tenants) {
      const r = await seedTenant(client, tenant, archivedFilter);
      total += r.rows;
    }

    await client.query('COMMIT');
    console.log(`Done. Seeded ${total} assessment result rows. Open /dashboard/college/hiring-assessment to verify.`);
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
