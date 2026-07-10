/* eslint-disable no-console */
/**
 * Demo interview slots (college_calendar) + application outcomes for college Interviews screen.
 *
 * Usage:
 *   npm run seed:college-interviews-demo
 *   TENANT_ID=<uuid> npm run seed:college-interviews-demo
 */
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { Client } = require('pg');

const DEMO_MARKER = 'Demo seed for college Interviews dashboard (safe to delete).';

const SLOT_TEMPLATES = [
  {
    company: 'TechCorp Solutions',
    round: 'Technical Interview',
    startTime: '09:30',
    endTime: '11:30',
    interviewer: 'Dr. Rajesh Kumar',
    panelNames: 'Panel A — CRC Room 101',
    createdBy: 'TPO',
    daysFromNow: 7,
  },
  {
    company: 'GlobalSoft Technologies',
    round: 'HR Round',
    startTime: '14:00',
    endTime: '16:00',
    interviewer: 'Ms. Anita Desai',
    panelNames: 'Panel B — Seminar Hall',
    createdBy: 'Company',
    daysFromNow: 10,
  },
  {
    company: 'Innovent Labs',
    round: 'System Design Panel',
    startTime: '10:00',
    endTime: '12:30',
    interviewer: 'Prof. Venkat Subramanian',
    panelNames: 'Hybrid — online + CRC',
    createdBy: 'TPO',
    daysFromNow: 14,
  },
  {
    company: 'FinEdge Systems',
    round: 'Final Interview',
    startTime: '08:45',
    endTime: '10:15',
    interviewer: 'Mr. Karthik Iyer',
    panelNames: 'Panel C',
    createdBy: 'Company',
    daysFromNow: 18,
  },
];

const APP_STATUSES = ['shortlisted', 'in_progress', 'selected', 'rejected', 'shortlisted', 'in_progress'];

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

async function ensureInterviewSlotEventType(client) {
  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'college_calendar_event_type_check'
          AND table_name = 'college_calendar'
      ) THEN
        ALTER TABLE college_calendar DROP CONSTRAINT college_calendar_event_type_check;
      END IF;
    END $$;
  `);
  await client.query(`
    ALTER TABLE college_calendar
    ADD CONSTRAINT college_calendar_event_type_check
    CHECK (event_type IN (
      'exam', 'holiday', 'festival', 'placement_drive', 'interview_slot', 'workshop', 'other'
    ))
  `);
}

async function clearDemoSlots(client, tenantId) {
  await client.query(
    `DELETE FROM college_calendar
     WHERE tenant_id = $1::uuid
       AND event_type = 'interview_slot'
       AND description LIKE $2`,
    [tenantId, `%${DEMO_MARKER}%`],
  );
}

async function loadStudents(client, tenantId, archivedFilter, limit = 6) {
  const r = await client.query(
    `SELECT roll_number FROM student_profiles sp
     WHERE sp.tenant_id = $1::uuid
       AND sp.roll_number IS NOT NULL
       AND TRIM(sp.roll_number) <> ''
       ${archivedFilter}
     ORDER BY sp.roll_number
     LIMIT $2`,
    [tenantId, limit],
  );
  return r.rows.map((x) => x.roll_number);
}

async function loadDriveContext(client, tenantId) {
  const r = await client.query(
    `SELECT d.id AS drive_id, d.job_id, ep.company_name
     FROM placement_drives d
     LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
     WHERE d.tenant_id = $1::uuid
       AND d.status IN ('approved', 'scheduled', 'completed')
     ORDER BY d.drive_date DESC NULLS LAST
     LIMIT 6`,
    [tenantId],
  );
  return r.rows;
}

function formatDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function insertSlots(client, tenantId, rolls) {
  let count = 0;
  for (let i = 0; i < SLOT_TEMPLATES.length; i += 1) {
    const t = SLOT_TEMPLATES[i];
    const studentSlice = rolls.slice(i, i + 2);
    const desc = JSON.stringify({
      company: t.company,
      round: t.round,
      startTime: t.startTime,
      endTime: t.endTime,
      interviewer: t.interviewer,
      panelNames: t.panelNames,
      students: studentSlice,
      createdBy: t.createdBy,
      notes: DEMO_MARKER,
    });
    const date = formatDateOffset(t.daysFromNow + i);
    const title = `${t.company} • ${t.round}`;
    await client.query(
      `INSERT INTO college_calendar (id, tenant_id, title, event_type, start_date, end_date, is_blocking, description)
       VALUES ($1::uuid, $2::uuid, $3, 'interview_slot', $4::date, $4::date, false, $5)`,
      [randomUUID(), tenantId, title, date, desc],
    );
    count += 1;
  }
  return count;
}

async function upsertApplicationOutcomes(client, tenantId, archivedFilter) {
  const drives = await loadDriveContext(client, tenantId);
  if (!drives.length) return 0;

  const students = await client.query(
    `SELECT sp.id, sp.roll_number FROM student_profiles sp
     WHERE sp.tenant_id = $1::uuid ${archivedFilter}
     ORDER BY sp.roll_number
     LIMIT 8`,
    [tenantId],
  );

  let n = 0;
  for (let i = 0; i < students.rows.length; i += 1) {
    const sp = students.rows[i];
    const drive = drives[i % drives.length];
    const status = APP_STATUSES[i % APP_STATUSES.length];
    const round = status === 'selected' ? 4 : status === 'rejected' ? 2 : 2;

    await client.query(
      `INSERT INTO applications (student_id, drive_id, job_id, status, current_round, applied_at, notes)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW() - ($6::text || ' days')::interval, $7)
       ON CONFLICT (student_id, drive_id) DO UPDATE SET
         status = EXCLUDED.status,
         current_round = EXCLUDED.current_round,
         notes = COALESCE(EXCLUDED.notes, applications.notes),
         updated_at = NOW()`,
      [
        sp.id,
        drive.drive_id,
        drive.job_id,
        status,
        round,
        String((i % 10) + 2),
        DEMO_MARKER,
      ],
    );
    n += 1;
  }
  return n;
}

async function seedTenant(client, tenant, archivedFilter) {
  await clearDemoSlots(client, tenant.id);
  const rolls = await loadStudents(client, tenant.id, archivedFilter, 8);
  const slotCount = rolls.length ? await insertSlots(client, tenant.id, rolls) : 0;
  const appCount = await upsertApplicationOutcomes(client, tenant.id, archivedFilter);

  const counts = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM college_calendar
        WHERE tenant_id = $1::uuid AND event_type = 'interview_slot') AS slots,
       (SELECT COUNT(*)::int FROM applications a
        JOIN student_profiles sp ON sp.id = a.student_id
        WHERE sp.tenant_id = $1::uuid
          AND a.status IN ('shortlisted', 'selected', 'rejected', 'in_progress')
          ${archivedFilter.replace('sp.', 'sp.')}) AS results`,
    [tenant.id],
  );
  const row = counts.rows[0] || { slots: 0, results: 0 };
  console.log(
    `  ${tenant.name}: ${slotCount} demo slots, ${appCount} application outcomes updated`
      + ` (tenant totals: ${row.slots} slots, ${row.results} results rows)`,
  );
  return { slots: slotCount, apps: appCount };
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

    console.log(`Seeding college interview demos for ${tenants.length} tenant(s)…`);
    await client.query('BEGIN');
    try {
      await ensureInterviewSlotEventType(client);
    } catch (e) {
      console.warn('Note: could not widen college_calendar event_type (run migration 007):', e.message);
    }

    let totalSlots = 0;
    let totalApps = 0;
    for (const tenant of tenants) {
      const r = await seedTenant(client, tenant, archivedFilter);
      totalSlots += r.slots;
      totalApps += r.apps;
    }

    await client.query('COMMIT');
    console.log(`Done. Created ${totalSlots} interview slots and refreshed ${totalApps} application outcomes.`);
    console.log('Open /dashboard/college/interviews to verify.');
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
