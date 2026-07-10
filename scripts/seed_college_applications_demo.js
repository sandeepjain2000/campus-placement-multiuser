/* eslint-disable no-console */
/**
 * Idempotent demo applications for the college Applications screen.
 * Uses real students, drives, and visible jobs per college tenant.
 *
 * Usage:
 *   node scripts/seed_college_applications_demo.js
 *   TENANT_ID=<uuid> node scripts/seed_college_applications_demo.js
 *
 * Requires DATABASE_URL or SUPABASE_DATABASE_URL in .env.local
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DEMO_NOTE = 'Demo seed for college Applications dashboard (safe to delete).';
const DRIVE_STATUSES = ['applied', 'shortlisted', 'in_progress', 'selected', 'rejected'];

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
  const r = await client.query(
    `SELECT id, name FROM tenants WHERE type = 'college' ORDER BY name`,
  );
  return r.rows;
}

async function loadStudents(client, tenantId, archivedFilter) {
  const r = await client.query(
    `SELECT id, roll_number, department
     FROM student_profiles sp
     WHERE sp.tenant_id = $1::uuid ${archivedFilter}
     ORDER BY sp.created_at NULLS LAST, sp.roll_number NULLS LAST
     LIMIT 10`,
    [tenantId],
  );
  return r.rows;
}

async function loadDrives(client, tenantId) {
  const r = await client.query(
    `SELECT id, job_id, title, status
     FROM placement_drives
     WHERE tenant_id = $1::uuid
       AND status IN ('approved', 'scheduled', 'completed')
     ORDER BY drive_date DESC NULLS LAST, created_at DESC
     LIMIT 5`,
    [tenantId],
  );
  return r.rows;
}

async function loadProgramJobs(client, tenantId) {
  let r = await client.query(
    `SELECT jp.id, jp.title, jp.job_type::text AS job_type
     FROM job_postings jp
     INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
     WHERE jp.status = 'published'
       AND jp.job_type IN ('internship', 'full_time', 'short_project', 'hackathon', 'contract', 'part_time')
     ORDER BY jp.created_at DESC NULLS LAST
     LIMIT 8`,
    [tenantId],
  );
  if (r.rows.length) return r.rows;

  r = await client.query(
    `SELECT DISTINCT jp.id, jp.title, jp.job_type::text AS job_type
     FROM job_postings jp
     INNER JOIN placement_drives d ON d.job_id = jp.id AND d.tenant_id = $1::uuid
     WHERE jp.status = 'published'
     ORDER BY jp.title
     LIMIT 8`,
    [tenantId],
  );
  return r.rows;
}

async function upsertDriveApplication(client, { studentId, drive, status, round, daysAgo }) {
  await client.query(
    `INSERT INTO applications (student_id, drive_id, job_id, status, current_round, applied_at, notes)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW() - ($6::text || ' days')::interval, $7)
     ON CONFLICT (student_id, drive_id) DO UPDATE SET
       status = EXCLUDED.status,
       current_round = EXCLUDED.current_round,
       applied_at = EXCLUDED.applied_at,
       notes = EXCLUDED.notes,
       updated_at = NOW()`,
    [studentId, drive.id, drive.job_id, status, round, String(daysAgo), DEMO_NOTE],
  );
}

async function upsertProgramApplication(client, { studentId, jobId, status, daysAgo, jobType }) {
  await client.query(
    `INSERT INTO program_applications (student_id, job_id, status, notes, applied_at)
     VALUES ($1::uuid, $2::uuid, $3, $4, NOW() - ($5::text || ' days')::interval)
     ON CONFLICT (student_id, job_id) DO UPDATE SET
       status = EXCLUDED.status,
       notes = EXCLUDED.notes,
       applied_at = EXCLUDED.applied_at,
       updated_at = NOW()`,
    [studentId, jobId, status, `${DEMO_NOTE} (${jobType || 'program'})`, String(daysAgo)],
  );
}

async function seedTenant(client, tenant, archivedFilter) {
  const students = await loadStudents(client, tenant.id, archivedFilter);
  const drives = await loadDrives(client, tenant.id);
  const jobs = await loadProgramJobs(client, tenant.id);

  if (!students.length) {
    console.warn(`  [skip] ${tenant.name}: no students`);
    return { drives: 0, programs: 0 };
  }
  if (!drives.length && !jobs.length) {
    console.warn(`  [skip] ${tenant.name}: no drives or visible jobs`);
    return { drives: 0, programs: 0 };
  }

  let driveCount = 0;
  let programCount = 0;

  for (let i = 0; i < students.length; i += 1) {
    const student = students[i];
    if (drives.length) {
      const drive = drives[i % drives.length];
      await upsertDriveApplication(client, {
        studentId: student.id,
        drive,
        status: DRIVE_STATUSES[i % DRIVE_STATUSES.length],
        round: i % 4,
        daysAgo: (i % 12) + 1,
      });
      driveCount += 1;
    }
    if (jobs.length && i < Math.min(students.length, jobs.length + 2)) {
      const job = jobs[i % jobs.length];
      await upsertProgramApplication(client, {
        studentId: student.id,
        jobId: job.id,
        status: DRIVE_STATUSES[(i + 1) % DRIVE_STATUSES.length],
        daysAgo: (i % 9) + 2,
        jobType: job.job_type,
      });
      programCount += 1;
    }
  }

  const totals = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM applications a
        INNER JOIN student_profiles sp ON sp.id = a.student_id AND sp.tenant_id = $1::uuid) AS drive_apps,
       (SELECT COUNT(*)::int FROM program_applications pa
        INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $1::uuid) AS program_apps`,
    [tenant.id],
  );
  const row = totals.rows[0] || { drive_apps: 0, program_apps: 0 };
  console.log(
    `  ${tenant.name}: upserted ${driveCount} drive + ${programCount} program rows`
      + ` (tenant totals: ${row.drive_apps} drives, ${row.program_apps} programs)`,
  );
  return { drives: driveCount, programs: programCount };
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

    console.log(`Seeding college application demos for ${tenants.length} tenant(s)…`);
    await client.query('BEGIN');

    let totalDrives = 0;
    let totalPrograms = 0;
    for (const tenant of tenants) {
      const result = await seedTenant(client, tenant, archivedFilter);
      totalDrives += result.drives;
      totalPrograms += result.programs;
    }

    await client.query('COMMIT');
    console.log(`Done. Upserted ${totalDrives} drive applications and ${totalPrograms} program applications.`);
    console.log('Open /dashboard/college/applications as a college admin to verify.');
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
