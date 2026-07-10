/* eslint-disable no-console */
/**
 * Idempotent demo offers for the college Offers screen.
 * Mix of employer-linked and college-reported (off-platform) offers.
 *
 * Usage:
 *   npm run seed:college-offers-demo
 *   TENANT_ID=<uuid> npm run seed:college-offers-demo
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DEMO_PREFIX = '[Demo] ';
const DEMO_TAG = 'Demo seed for college Offers dashboard (safe to delete).';

const STATUSES = ['pending', 'accepted', 'rejected', 'pending', 'accepted', 'expired', 'revoked'];
const MANUAL_COMPANIES = [
  'Acme Analytics',
  'Northstar FinTech',
  'CloudNine Systems',
  'Vertex Consulting',
  'Horizon BioTech',
];
const LOCATIONS = ['Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Remote'];

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

async function hasReportedCompanyColumn(client) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'reported_company_name'`,
  );
  return r.rowCount > 0;
}

async function hasIsLatestColumn(client) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'is_latest'`,
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

async function clearDemoOffers(client, tenantId) {
  const r = await client.query(
    `DELETE FROM offers o
     USING student_profiles sp
     WHERE o.student_id = sp.id
       AND sp.tenant_id = $1::uuid
       AND o.job_title LIKE $2`,
    [tenantId, `${DEMO_PREFIX}%`],
  );
  return r.rowCount || 0;
}

async function refreshLatestFlags(client, studentId, hasReported) {
  const unified = `WITH ranked AS (
       SELECT o.id,
         ROW_NUMBER() OVER (
           PARTITION BY o.student_id,
             LOWER(TRIM(regexp_replace(COALESCE(
               CASE WHEN o.employer_id IS NOT NULL THEN ep.company_name END,
               NULLIF(TRIM(COALESCE(o.reported_company_name, '')), ''),
               CASE
                 WHEN o.employer_id IS NOT NULL THEN 'employer:' || o.employer_id::text
                 ELSE 'offplatform'
               END
             ), '[[:space:]]+', ' ', 'g')))
           ORDER BY o.created_at DESC, o.id DESC
         ) AS rn
       FROM offers o
       LEFT JOIN employer_profiles ep ON ep.id = o.employer_id
       WHERE o.student_id = $1::uuid
     )
     UPDATE offers o
     SET is_latest = CASE WHEN r.rn = 1 THEN 1 ELSE 0 END, updated_at = NOW()
     FROM ranked r
     WHERE o.id = r.id`;

  const legacy = `WITH ranked AS (
       SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY student_id, COALESCE(employer_id::text, 'offplatform')
           ORDER BY created_at DESC, id DESC
         ) AS rn
       FROM offers WHERE student_id = $1::uuid
     )
     UPDATE offers o
     SET is_latest = CASE WHEN r.rn = 1 THEN 1 ELSE 0 END, updated_at = NOW()
     FROM ranked r WHERE o.id = r.id`;

  try {
    if (hasReported) await client.query(unified, [studentId]);
    else await client.query(legacy, [studentId]);
  } catch (e) {
    if (e?.code === '42703' && String(e?.message || '').includes('is_latest')) return;
    throw e;
  }
}

function deadlineForStatus(status, daysFromNow) {
  if (status === 'expired') {
    return new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (status === 'pending' || status === 'revoked') {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
}

function timestampsForStatus(status) {
  const t = new Date().toISOString();
  return {
    acceptedAt: status === 'accepted' ? t : null,
    rejectedAt: status === 'rejected' ? t : null,
  };
}

async function findApplication(client, studentId, driveId) {
  const r = await client.query(
    `SELECT id FROM applications WHERE student_id = $1::uuid AND drive_id = $2::uuid LIMIT 1`,
    [studentId, driveId],
  );
  return r.rows[0]?.id || null;
}

async function insertOffer(client, row, hasReported) {
  const { acceptedAt, rejectedAt } = timestampsForStatus(row.status);
  const cols = [
    'student_id',
    'employer_id',
    'drive_id',
    'application_id',
    'job_title',
    'salary',
    'location',
    'status',
    'joining_date',
    'deadline',
    'accepted_at',
    'rejected_at',
    'rejection_reason',
    'salary_currency',
  ];
  const vals = [
    row.studentId,
    row.employerId,
    row.driveId,
    row.applicationId,
    row.jobTitle,
    row.salary,
    row.location,
    row.status,
    row.joiningDate,
    row.deadline,
    acceptedAt,
    rejectedAt,
    row.rejectionReason,
    'INR',
  ];
  if (hasReported) {
    cols.push('reported_company_name');
    vals.push(row.reportedCompanyName);
  }
  const placeholders = vals.map((_, i) => `$${i + 1}`);
  await client.query(
    `INSERT INTO offers (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`,
    vals,
  );
}

async function seedTenant(client, tenant, archivedFilter, hasReported, hasIsLatest) {
  const cleared = await clearDemoOffers(client, tenant.id);

  const students = await client.query(
    `SELECT id, roll_number FROM student_profiles sp
     WHERE sp.tenant_id = $1::uuid ${archivedFilter}
     ORDER BY sp.created_at NULLS LAST, sp.roll_number NULLS LAST
     LIMIT 8`,
    [tenant.id],
  );

  const drives = await client.query(
    `SELECT d.id AS drive_id, d.employer_id, d.title AS drive_title,
            COALESCE(jp.title, d.title) AS role_title,
            COALESCE(jp.salary_max, jp.salary_min, 1200000)::numeric AS salary,
            ep.company_name
     FROM placement_drives d
     LEFT JOIN job_postings jp ON jp.id = d.job_id
     LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
     WHERE d.tenant_id = $1::uuid
       AND d.status IN ('approved', 'scheduled', 'completed')
     ORDER BY d.drive_date DESC NULLS LAST
     LIMIT 4`,
    [tenant.id],
  );

  if (!students.rows.length) {
    console.warn(`  [skip] ${tenant.name}: no students`);
    return { inserted: 0, cleared };
  }

  const touchedStudents = new Set();
  let inserted = 0;

  for (let i = 0; i < students.rows.length; i += 1) {
    const student = students.rows[i];
    const status = STATUSES[i % STATUSES.length];
    const location = LOCATIONS[i % LOCATIONS.length];
    const joiningDate = new Date(Date.now() + (90 + i * 12) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    if (i % 2 === 0 && drives.rows.length) {
      const drive = drives.rows[i % drives.rows.length];
      const applicationId = await findApplication(client, student.id, drive.drive_id);
      const roleTitle = drive.role_title || 'Software Engineer';
      await insertOffer(
        client,
        {
          studentId: student.id,
          employerId: drive.employer_id,
          driveId: drive.drive_id,
          applicationId,
          jobTitle: `${DEMO_PREFIX}${roleTitle}`,
          salary: Number(drive.salary) || 1200000,
          location,
          status,
          joiningDate,
          deadline: deadlineForStatus(status, 5 + (i % 4)),
          rejectionReason: status === 'rejected' ? DEMO_TAG : null,
          reportedCompanyName: hasReported ? null : undefined,
        },
        hasReported,
      );
    } else {
      const company = MANUAL_COMPANIES[i % MANUAL_COMPANIES.length];
      const titles = ['Graduate Engineer', 'Business Analyst', 'Product Analyst', 'Data Engineer'];
      await insertOffer(
        client,
        {
          studentId: student.id,
          employerId: null,
          driveId: null,
          applicationId: null,
          jobTitle: `${DEMO_PREFIX}${titles[i % titles.length]}`,
          salary: 800000 + i * 125000,
          location,
          status,
          joiningDate,
          deadline: deadlineForStatus(status, 7 + (i % 3)),
          rejectionReason: status === 'rejected' ? DEMO_TAG : null,
          reportedCompanyName: company,
        },
        hasReported,
      );
    }

    touchedStudents.add(student.id);
    inserted += 1;
  }

  if (hasIsLatest) {
    for (const studentId of touchedStudents) {
      await refreshLatestFlags(client, studentId, hasReported);
    }
  }

  const visible = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM offers o
     JOIN student_profiles sp ON sp.id = o.student_id
     WHERE sp.tenant_id = $1::uuid
       AND o.job_title LIKE $2
       ${hasIsLatest ? 'AND o.is_latest = 1' : ''}
       ${archivedFilter}`,
    [tenant.id, `${DEMO_PREFIX}%`],
  );

  console.log(
    `  ${tenant.name}: cleared ${cleared} old demo rows, inserted ${inserted}`
      + ` (${visible.rows[0]?.n || 0} visible with is_latest=1)`,
  );
  return { inserted, cleared };
}

async function main() {
  const tenantFilter = process.env.TENANT_ID || process.argv[2] || null;
  const client = new Client(getDbConfig());
  await client.connect();

  try {
    const hasArchive = await hasArchivedColumn(client);
    const hasReported = await hasReportedCompanyColumn(client);
    const hasIsLatest = await hasIsLatestColumn(client);
    const archivedFilter = hasArchive ? 'AND sp.archived_at IS NULL' : '';

    if (!hasReported) {
      console.warn('Warning: offers.reported_company_name missing — off-platform demo rows may fail.');
    }

    const tenants = await listCollegeTenants(client, tenantFilter);
    if (!tenants.length) {
      throw new Error(tenantFilter ? `College tenant not found: ${tenantFilter}` : 'No college tenants found');
    }

    console.log(`Seeding college offer demos for ${tenants.length} tenant(s)…`);
    await client.query('BEGIN');

    let total = 0;
    for (const tenant of tenants) {
      const r = await seedTenant(client, tenant, archivedFilter, hasReported, hasIsLatest);
      total += r.inserted;
    }

    await client.query('COMMIT');
    console.log(`Done. Inserted ${total} demo offers. Open /dashboard/college/offers to verify.`);
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
