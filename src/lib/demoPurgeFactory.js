import { query, transaction } from '@/lib/db';
import { DEMO_SCREEN_SQL_PARAMS } from '@/lib/demoScreenAllowlist';

const DEMO_EMAIL_DOMAIN = 'placementhub.test';
const DEMO_JOB_MARKER = 'Data Tester API';
const DEMO_DRIVE_MARKER = 'Demo placement drive';
const DEMO_APP_MARKER = 'Data Tester';
const GUIDED_RUNNER_TITLE_PREFIX = 'GT-';
const SEED_JOB_ID_PREFIX = 'd1000000-';
const SEED_LOOP_DESCRIPTIONS = [
  'Summer internship program.',
  'Short project opportunity.',
  'Full time software engineer role.',
];
const EMPLOYER_UI_DESCRIPTION_MARKER = 'Job description (auto-generated from title';
const ANALYTICS_TEST_DESCRIPTIONS = [
  'Completed internship listing for analytics tests.',
  'Completed drive record for analytics testing.',
];

/** SQL fragment — job/internship rows eligible for sandbox purge (parameter $marker is ILIKE pattern). */
const PURGEABLE_JOB_WHERE = `(
  jp.description ILIKE $MARKER$
  OR jp.title ILIKE '${GUIDED_RUNNER_TITLE_PREFIX}%'
  OR jp.description ~* '^Duration:\\s*\\d+\\s+months\\.'
  OR jp.id::text LIKE '${SEED_JOB_ID_PREFIX}%'
  OR jp.description = ANY($SEED_DESC$)
  OR jp.description ILIKE '%${EMPLOYER_UI_DESCRIPTION_MARKER}%'
  OR jp.description = ANY($ANALYTICS_DESC$)
)`;

function purgeableJobSql(
  markerPlaceholder,
  seedDescPlaceholder = '$SEED_DESC$',
  analyticsDescPlaceholder = '$ANALYTICS_DESC$',
) {
  return PURGEABLE_JOB_WHERE.replace('$MARKER$', markerPlaceholder)
    .replace('$SEED_DESC$', seedDescPlaceholder)
    .replace('$ANALYTICS_DESC$', analyticsDescPlaceholder);
}

function purgeableJobSource(row) {
  if (String(row.title || '').startsWith(GUIDED_RUNNER_TITLE_PREFIX)) return 'guided runner';
  if (String(row.description || '').includes(DEMO_JOB_MARKER)) return 'data tester API';
  if (/^Duration:\s*\d+\s+months\./i.test(String(row.description || ''))) return 'UI / playbook form';
  if (String(row.description || '').includes(EMPLOYER_UI_DESCRIPTION_MARKER)) return 'employer UI sandbox';
  if (ANALYTICS_TEST_DESCRIPTIONS.includes(String(row.description || '').trim())) return 'analytics seed';
  if (SEED_LOOP_DESCRIPTIONS.includes(String(row.description || '').trim())) return 'employer seed loop';
  if (String(row.id || '').startsWith(SEED_JOB_ID_PREFIX)) return 'seed data';
  return 'sandbox';
}

const PROGRAM_JOB_TYPES = ['internship', 'short_project', 'hackathon'];

const JOB_KIND_TYPES = {
  job: ['full_time', 'part_time'],
  internship: PROGRAM_JOB_TYPES,
};

const PURGE_TYPES = new Set([
  'job',
  'internship',
  'drive',
  'student',
  'program_application',
  'drive_application',
]);

/** @typedef {{ userId?: string | null, tenantId?: string | null, ipAddress?: string | null }} DemoPurgeAuditContext */

async function resolveJobTenantId(client, jobId, driveRows = []) {
  if (driveRows[0]?.tenant_id) return driveRows[0].tenant_id;
  const vis = await client.query(
    `SELECT tenant_id FROM job_posting_visibility WHERE job_id = $1::uuid LIMIT 1`,
    [jobId],
  );
  return vis.rows[0]?.tenant_id || null;
}

/**
 * Record demo purge in audit_logs (same transaction as soft-delete).
 * @param {import('pg').PoolClient} client
 * @param {DemoPurgeAuditContext | undefined} audit
 * @param {object} detail
 */
async function writePurgeAuditLog(client, audit, detail) {
  const {
    entityType,
    entityId,
    label,
    cascade,
    transactionId,
    tenantId,
  } = detail;
  await client.query(
    `INSERT INTO audit_logs (user_id, tenant_id, action, entity_type, entity_id, new_values, ip_address)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb, $7)`,
    [
      audit?.userId || null,
      audit?.tenantId || tenantId || null,
      'DEMO_PURGE',
      String(entityType || 'demo_entity').slice(0, 50),
      entityId,
      JSON.stringify({
        label,
        entityType,
        entityTenantId: tenantId || null,
        contextTenantId: audit?.tenantId || null,
        softDelete: true,
        cascade,
        demoPurgeTransactionId: transactionId,
      }),
      audit?.ipAddress ? String(audit.ipAddress).trim().slice(0, 45) : null,
    ],
  );
}

async function markDeleted(client, table, whereSql, params, { touchUpdatedAt = true } = {}) {
  const setClause = touchUpdatedAt
    ? 'is_deleted = true, updated_at = NOW()'
    : 'is_deleted = true';
  const res = await client.query(
    `UPDATE ${table}
     SET ${setClause}
     WHERE ${whereSql}
       AND COALESCE(is_deleted, false) = false
     RETURNING id`,
    params,
  );
  return res.rowCount;
}

async function logPurge(client, entityType, entityId, cascadeSummary) {
  const ins = await client.query(
    `INSERT INTO demo_purge_transactions (entity_type, entity_id, is_deleted, cascade_summary)
     VALUES ($1, $2, true, $3::jsonb)
     RETURNING id, created_at`,
    [entityType, entityId, JSON.stringify(cascadeSummary)],
  );
  return ins.rows[0];
}

/** Move in-app alerts to trash when they reference purged demo entities. */
async function trashAlertsForEntities(client, { entityIds = [], textPatterns = [] } = {}) {
  let total = 0;
  for (const id of [...new Set(entityIds.filter(Boolean))]) {
    const res = await client.query(
      `UPDATE notifications
       SET deleted_at = COALESCE(deleted_at, NOW())
       WHERE deleted_at IS NULL
         AND (link ILIKE $1 OR message ILIKE $1 OR title ILIKE $1)`,
      [`%${id}%`],
    );
    total += res.rowCount;
  }
  for (const pat of [...new Set(textPatterns.filter(Boolean))]) {
    const res = await client.query(
      `UPDATE notifications
       SET deleted_at = COALESCE(deleted_at, NOW())
       WHERE deleted_at IS NULL
         AND (message ILIKE $1 OR title ILIKE $1)`,
      [`%${pat}%`],
    );
    total += res.rowCount;
  }
  return total;
}

/** Permanently remove every in-app alert (inbox + trash). Used by bulk QA purges. */
async function deleteAllAlerts(client) {
  const res = await client.query(`DELETE FROM notifications`);
  return res.rowCount || 0;
}

/** Remove college calendar rows tied to purged placement drives (sandbox cleanup). */
async function removeCalendarEntriesForDrives(client, drives) {
  let total = 0;
  for (const d of drives) {
    if (!d?.id || !d?.tenant_id) continue;
    const res = await client.query(
      `DELETE FROM college_calendar
       WHERE tenant_id = $1::uuid
         AND (
           description ILIKE $2
           OR (
             event_type = 'placement_drive'
             AND title ILIKE $3
             AND ($4::date IS NULL OR start_date = $4::date)
           )
         )`,
      [d.tenant_id, `%${d.id}%`, d.title || '', d.drive_date || null],
    );
    total += res.rowCount;
  }
  return total;
}

async function assertDemoJob(client, jobId, kind = 'job') {
  const types = JOB_KIND_TYPES[kind] || JOB_KIND_TYPES.job;
  const res = await client.query(
    `SELECT id, title, job_type, description FROM job_postings jp
     WHERE jp.id = $1::uuid AND COALESCE(jp.is_deleted, false) = false
       AND jp.job_type = ANY($2::text[])
       AND ${purgeableJobSql('$3', '$4', '$5')}
     LIMIT 1`,
    [jobId, types, `%${DEMO_JOB_MARKER}%`, SEED_LOOP_DESCRIPTIONS, ANALYTICS_TEST_DESCRIPTIONS],
  );
  if (!res.rows.length) {
    const label = kind === 'internship' ? 'program listing' : 'job';
    const err = new Error(
      `Demo ${label} not found or not purge-eligible (Data Tester, guided runner GT-*, UI/playbook forms, employer UI auto-generated text, seed id, or seed loop descriptions).`,
    );
    err.code = 'NOT_FOUND';
    throw err;
  }
  return res.rows[0];
}

async function assertDemoDrive(client, driveId) {
  const res = await client.query(
    `SELECT id, title, tenant_id, drive_date FROM placement_drives
     WHERE id = $1::uuid AND COALESCE(is_deleted, false) = false
       AND description ILIKE $2
     LIMIT 1`,
    [driveId, `%${DEMO_DRIVE_MARKER}%`],
  );
  if (!res.rows.length) {
    const err = new Error('Drive not found or not a demo drive (already purged?)');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return res.rows[0];
}

async function assertDemoStudent(client, studentId) {
  const res = await client.query(
    `SELECT sp.id, sp.user_id, sp.tenant_id, u.email, u.first_name, u.last_name
     FROM student_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.id = $1::uuid
       AND COALESCE(sp.is_deleted, false) = false
       AND u.email ILIKE $2
     LIMIT 1`,
    [studentId, `%@${DEMO_EMAIL_DOMAIN}`],
  );
  if (!res.rows.length) {
    const err = new Error('Student not found or not a @placementhub.test demo account');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return res.rows[0];
}

/**
 * Soft-delete a demo job/internship posting and cascade program apps, drives, alerts, calendar.
 * @param {string} jobId
 * @param {{ kind?: 'job' | 'internship' }} options
 */
export async function purgeDemoJob(jobId, options = {}) {
  const kind = options.kind === 'internship' ? 'internship' : 'job';
  const audit = options.audit;
  return transaction(async (client) => {
    const job = await assertDemoJob(client, jobId, kind);
    const summary = {
      job: 0,
      programApplications: 0,
      drives: 0,
      driveApplications: 0,
      offers: 0,
      assessments: 0,
      calendarEntries: 0,
      alertsTrashed: 0,
    };

    const driveRows = (
      await client.query(
        `SELECT id, title, tenant_id, drive_date
         FROM placement_drives
         WHERE job_id = $1::uuid AND COALESCE(is_deleted, false) = false`,
        [jobId],
      )
    ).rows;
    const driveIds = driveRows.map((r) => r.id);

    const progAppIds = (
      await client.query(
        `SELECT id FROM program_applications
         WHERE job_id = $1::uuid AND COALESCE(is_deleted, false) = false`,
        [jobId],
      )
    ).rows.map((r) => r.id);

    summary.job = await markDeleted(client, 'job_postings', 'id = $1::uuid', [jobId]);
    summary.programApplications = await markDeleted(
      client,
      'program_applications',
      'job_id = $1::uuid',
      [jobId],
    );

    if (driveIds.length) {
      summary.drives = await markDeleted(client, 'placement_drives', 'job_id = $1::uuid', [jobId]);
      summary.driveApplications = await markDeleted(
        client,
        'applications',
        'drive_id = ANY($1::uuid[]) OR job_id = $2::uuid',
        [driveIds, jobId],
      );
      summary.offers += await markDeleted(client, 'offers', 'drive_id = ANY($1::uuid[])', [driveIds]);
      summary.assessments += await markDeleted(
        client,
        'employer_assessment_uploads',
        'drive_id = ANY($1::uuid[]) OR job_id = $2::uuid',
        [driveIds, jobId],
        { touchUpdatedAt: false },
      );
    } else {
      summary.driveApplications = await markDeleted(client, 'applications', 'job_id = $1::uuid', [jobId]);
      summary.assessments = await markDeleted(
        client,
        'employer_assessment_uploads',
        'job_id = $1::uuid',
        [jobId],
        { touchUpdatedAt: false },
      );
    }

    summary.calendarEntries = await removeCalendarEntriesForDrives(client, driveRows);
    summary.alertsTrashed = await trashAlertsForEntities(client, {
      entityIds: [jobId, ...driveIds, ...progAppIds],
      textPatterns: [job.title, DEMO_JOB_MARKER],
    });

    const txn = await logPurge(client, kind, jobId, summary);
    await writePurgeAuditLog(client, audit, {
      entityType: kind,
      entityId: jobId,
      label: job.title,
      cascade: summary,
      transactionId: txn.id,
      tenantId: await resolveJobTenantId(client, jobId, driveRows),
    });
    return {
      ok: true,
      entityType: kind,
      entityId: jobId,
      label: job.title,
      jobType: job.job_type,
      isDeleted: true,
      cascade: summary,
      transactionId: txn.id,
      purgedAt: txn.created_at,
    };
  });
}

/** Soft-delete a demo placement drive and cascade applications, offers, assessments, calendar, alerts. */
export async function purgeDemoDrive(driveId, options = {}) {
  const audit = options.audit;
  return transaction(async (client) => {
    const drive = await assertDemoDrive(client, driveId);
    const summary = {
      drive: 0,
      applications: 0,
      offers: 0,
      assessments: 0,
      calendarEntries: 0,
      alertsTrashed: 0,
    };

    const appIds = (
      await client.query(
        `SELECT id FROM applications
         WHERE drive_id = $1::uuid AND COALESCE(is_deleted, false) = false`,
        [driveId],
      )
    ).rows.map((r) => r.id);

    summary.drive = await markDeleted(client, 'placement_drives', 'id = $1::uuid', [driveId]);
    summary.applications = await markDeleted(client, 'applications', 'drive_id = $1::uuid', [driveId]);
    summary.offers = await markDeleted(client, 'offers', 'drive_id = $1::uuid', [driveId]);
    summary.assessments = await markDeleted(
      client,
      'employer_assessment_uploads',
      'drive_id = $1::uuid',
      [driveId],
      { touchUpdatedAt: false },
    );

    summary.calendarEntries = await removeCalendarEntriesForDrives(client, [drive]);
    summary.alertsTrashed = await trashAlertsForEntities(client, {
      entityIds: [driveId, ...appIds],
      textPatterns: [drive.title, DEMO_DRIVE_MARKER],
    });

    const txn = await logPurge(client, 'drive', driveId, summary);
    await writePurgeAuditLog(client, audit, {
      entityType: 'drive',
      entityId: driveId,
      label: drive.title,
      cascade: summary,
      transactionId: txn.id,
      tenantId: drive.tenant_id,
    });
    return {
      ok: true,
      entityType: 'drive',
      entityId: driveId,
      label: drive.title,
      isDeleted: true,
      cascade: summary,
      transactionId: txn.id,
      purgedAt: txn.created_at,
    };
  });
}

/** Soft-delete demo student and cascade applications / offers / alerts. */
export async function purgeDemoStudent(studentId, options = {}) {
  const audit = options.audit;
  return transaction(async (client) => {
    const student = await assertDemoStudent(client, studentId);
    const summary = {
      student: 0,
      programApplications: 0,
      driveApplications: 0,
      offers: 0,
      userDeactivated: 0,
      alertsTrashed: 0,
    };

    summary.programApplications = await markDeleted(
      client,
      'program_applications',
      'student_id = $1::uuid',
      [studentId],
    );
    summary.driveApplications = await markDeleted(client, 'applications', 'student_id = $1::uuid', [studentId]);
    summary.offers = await markDeleted(client, 'offers', 'student_id = $1::uuid', [studentId]);

    const sp = await client.query(
      `UPDATE student_profiles
       SET is_deleted = true, archived_at = COALESCE(archived_at, NOW()), updated_at = NOW()
       WHERE id = $1::uuid AND COALESCE(is_deleted, false) = false
       RETURNING user_id`,
      [studentId],
    );
    summary.student = sp.rowCount;
    if (sp.rows[0]?.user_id) {
      const u = await client.query(
        `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1::uuid RETURNING id`,
        [sp.rows[0].user_id],
      );
      summary.userDeactivated = u.rowCount;
    }

    summary.alertsTrashed = await trashAlertsForEntities(client, {
      entityIds: [studentId, student.user_id],
      textPatterns: [student.email, DEMO_EMAIL_DOMAIN],
    });

    const txn = await logPurge(client, 'student', studentId, summary);
    const name = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    await writePurgeAuditLog(client, audit, {
      entityType: 'student',
      entityId: studentId,
      label: name || student.email,
      cascade: summary,
      transactionId: txn.id,
      tenantId: student.tenant_id,
    });
    return {
      ok: true,
      entityType: 'student',
      entityId: studentId,
      label: name || student.email,
      isDeleted: true,
      cascade: summary,
      transactionId: txn.id,
      purgedAt: txn.created_at,
    };
  });
}

async function purgeDemoProgramApplication(applicationId, options = {}) {
  const audit = options.audit;
  return transaction(async (client) => {
    const row = await client.query(
      `SELECT pa.id, jp.id AS job_id, jp.title, u.email, u.id AS user_id, sp.tenant_id
       FROM program_applications pa
       JOIN job_postings jp ON jp.id = pa.job_id
       JOIN student_profiles sp ON sp.id = pa.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE pa.id = $1::uuid
         AND COALESCE(pa.is_deleted, false) = false
         AND (pa.notes ILIKE $2 OR jp.description ILIKE $3)
         AND u.email ILIKE $4
       LIMIT 1`,
      [applicationId, `%${DEMO_APP_MARKER}%`, `%${DEMO_JOB_MARKER}%`, `%@${DEMO_EMAIL_DOMAIN}`],
    );
    if (!row.rows.length) {
      const err = new Error('Program application not found or not demo data');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const hit = row.rows[0];
    const summary = {
      programApplications: await markDeleted(client, 'program_applications', 'id = $1::uuid', [applicationId]),
      alertsTrashed: 0,
    };
    summary.alertsTrashed = await trashAlertsForEntities(client, {
      entityIds: [applicationId, hit.job_id, hit.user_id],
      textPatterns: [hit.title, DEMO_APP_MARKER],
    });
    const txn = await logPurge(client, 'program_application', applicationId, summary);
    await writePurgeAuditLog(client, audit, {
      entityType: 'program_application',
      entityId: applicationId,
      label: hit.title,
      cascade: summary,
      transactionId: txn.id,
      tenantId: hit.tenant_id,
    });
    return {
      ok: true,
      entityType: 'program_application',
      entityId: applicationId,
      label: hit.title,
      isDeleted: true,
      cascade: summary,
      transactionId: txn.id,
      purgedAt: txn.created_at,
    };
  });
}

async function purgeDemoDriveApplication(applicationId, options = {}) {
  const audit = options.audit;
  return transaction(async (client) => {
    const row = await client.query(
      `SELECT a.id, a.drive_id, d.title, u.email, u.id AS user_id, sp.tenant_id
       FROM applications a
       JOIN placement_drives d ON d.id = a.drive_id
       JOIN student_profiles sp ON sp.id = a.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE a.id = $1::uuid
         AND COALESCE(a.is_deleted, false) = false
         AND (a.notes ILIKE $2 OR d.description ILIKE $3)
         AND u.email ILIKE $4
       LIMIT 1`,
      [applicationId, `%${DEMO_APP_MARKER}%`, `%${DEMO_DRIVE_MARKER}%`, `%@${DEMO_EMAIL_DOMAIN}`],
    );
    if (!row.rows.length) {
      const err = new Error('Drive application not found or not demo data');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const hit = row.rows[0];
    const summary = {
      driveApplications: await markDeleted(client, 'applications', 'id = $1::uuid', [applicationId]),
      alertsTrashed: 0,
    };
    summary.alertsTrashed = await trashAlertsForEntities(client, {
      entityIds: [applicationId, hit.drive_id, hit.user_id],
      textPatterns: [hit.title, DEMO_APP_MARKER],
    });
    const txn = await logPurge(client, 'drive_application', applicationId, summary);
    await writePurgeAuditLog(client, audit, {
      entityType: 'drive_application',
      entityId: applicationId,
      label: hit.title,
      cascade: summary,
      transactionId: txn.id,
      tenantId: hit.tenant_id,
    });
    return {
      ok: true,
      entityType: 'drive_application',
      entityId: applicationId,
      label: hit.title,
      isDeleted: true,
      cascade: summary,
      transactionId: txn.id,
      purgedAt: txn.created_at,
    };
  });
}

export async function purgeDemoEntity(entityType, entityId, auditContext = {}) {
  const type = String(entityType || '').trim().toLowerCase();
  const id = String(entityId || '').trim();
  if (!PURGE_TYPES.has(type) || !id) {
    const err = new Error('entityType and entityId required');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const auditOpts = { audit: auditContext };

  switch (type) {
    case 'job':
      return purgeDemoJob(id, { kind: 'job', ...auditOpts });
    case 'internship':
      return purgeDemoJob(id, { kind: 'internship', ...auditOpts });
    case 'drive':
      return purgeDemoDrive(id, auditOpts);
    case 'student':
      return purgeDemoStudent(id, auditOpts);
    case 'program_application':
      return purgeDemoProgramApplication(id, auditOpts);
    case 'drive_application':
      return purgeDemoDriveApplication(id, auditOpts);
    default:
      throw new Error('Unsupported entityType');
  }
}

async function queryDemoJobPostings(scope, jobTypeSql) {
  const tenantId = scope?.tenantId || null;
  const employerId = scope?.employerId || null;
  const excludeDemoScreenEmployers = scope?.excludeDemoScreenEmployers !== false;
  const marker = `%${DEMO_JOB_MARKER}%`;
  const params = tenantId
    ? [tenantId, marker, SEED_LOOP_DESCRIPTIONS, ANALYTICS_TEST_DESCRIPTIONS]
    : [marker, SEED_LOOP_DESCRIPTIONS, ANALYTICS_TEST_DESCRIPTIONS];
  let markerIdx = tenantId ? 2 : 1;
  let seedIdx = tenantId ? 3 : 2;
  let analyticsIdx = tenantId ? 4 : 3;
  const tenantFilterJob = tenantId
    ? `AND (
         EXISTS (
           SELECT 1 FROM job_posting_visibility jpv
           WHERE jpv.job_id = jp.id AND jpv.tenant_id = $1::uuid
         )
         OR NOT EXISTS (
           SELECT 1 FROM job_posting_visibility jpv2 WHERE jpv2.job_id = jp.id
         )
       )`
    : '';
  let employerFilterSql = '';
  if (employerId) {
    params.push(employerId);
    employerFilterSql = `AND jp.employer_id = $${params.length}::uuid`;
  }
  let excludeDemoEmployerSql = '';
  if (excludeDemoScreenEmployers) {
    params.push(DEMO_SCREEN_SQL_PARAMS.employerEmails);
    excludeDemoEmployerSql = `AND NOT (LOWER(eu.email) = ANY($${params.length}::text[]))`;
  }
  return query(
    `SELECT jp.id, jp.title, jp.job_type, jp.description, jp.created_at
     FROM job_postings jp
     JOIN employer_profiles ep ON ep.id = jp.employer_id
     JOIN users eu ON eu.id = ep.user_id
     WHERE COALESCE(jp.is_deleted, false) = false
       AND ${purgeableJobSql(`$${markerIdx}`, `$${seedIdx}`, `$${analyticsIdx}`)}
       ${jobTypeSql}
       ${tenantFilterJob}
       ${employerFilterSql}
       ${excludeDemoEmployerSql}
     ORDER BY jp.created_at DESC
     LIMIT 30`,
    params,
  );
}

/** List demo entities eligible for one-at-a-time purge. */
export async function listDemoPurgeCandidates(options = {}) {
  const scope = {
    tenantId: options.tenantId || null,
    employerId: options.employerId || null,
    excludeDemoScreenEmployers: options.excludeDemoScreenEmployers !== false,
  };
  const tenantFilter = scope.tenantId ? 'AND sp.tenant_id = $1::uuid' : '';
  const tenantFilterDrive = scope.tenantId ? 'AND d.tenant_id = $1::uuid' : '';
  const params = scope.tenantId ? [scope.tenantId] : [];
  const driveMarkerIdx = params.length + 1;
  const driveMarkerParam = `%${DEMO_DRIVE_MARKER}%`;

  let driveEmployerSql = '';
  let driveExcludeDemoSql = '';
  if (scope.employerId) {
    params.push(scope.employerId);
    driveEmployerSql = `AND d.employer_id = $${params.length}::uuid`;
  }
  if (scope.excludeDemoScreenEmployers) {
    params.push(DEMO_SCREEN_SQL_PARAMS.employerEmails);
    driveExcludeDemoSql = `AND NOT (LOWER(eu.email) = ANY($${params.length}::text[]))`;
  }

  let progEmployerSql = '';
  let progExcludeDemoSql = '';
  const progParams = [...params];
  if (scope.employerId) {
    progParams.push(scope.employerId);
    progEmployerSql = `AND jp.employer_id = $${progParams.length}::uuid`;
  }
  if (scope.excludeDemoScreenEmployers) {
    progParams.push(DEMO_SCREEN_SQL_PARAMS.employerEmails);
    progExcludeDemoSql = `AND NOT (LOWER(eu.email) = ANY($${progParams.length}::text[]))`;
  }

  let driveAppEmployerSql = '';
  let driveAppExcludeDemoSql = '';
  const driveAppParams = [...params];
  if (scope.employerId) {
    driveAppParams.push(scope.employerId);
    driveAppEmployerSql = `AND d.employer_id = $${driveAppParams.length}::uuid`;
  }
  if (scope.excludeDemoScreenEmployers) {
    driveAppParams.push(DEMO_SCREEN_SQL_PARAMS.employerEmails);
    driveAppExcludeDemoSql = `AND NOT (LOWER(eu.email) = ANY($${driveAppParams.length}::text[]))`;
  }

  const [students, jobsRes, internshipsRes, drives, progApps, driveApps] = await Promise.all([
    scope.employerId
      ? Promise.resolve({ rows: [] })
      : query(
          `SELECT sp.id, u.email, u.first_name, u.last_name, sp.created_at
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE COALESCE(sp.is_deleted, false) = false
         AND u.email ILIKE '%@${DEMO_EMAIL_DOMAIN}'
         ${tenantFilter}
       ORDER BY sp.created_at DESC
       LIMIT 15`,
          params,
        ),
    queryDemoJobPostings(scope, `AND jp.job_type IN ('full_time', 'part_time')`),
    queryDemoJobPostings(
      scope,
      `AND jp.job_type IN (${PROGRAM_JOB_TYPES.map((t) => `'${t}'`).join(', ')})`,
    ),
    query(
      `SELECT d.id, d.title, d.status, d.created_at
       FROM placement_drives d
       JOIN employer_profiles ep ON ep.id = d.employer_id
       JOIN users eu ON eu.id = ep.user_id
       WHERE COALESCE(d.is_deleted, false) = false
         AND d.description ILIKE $${driveMarkerIdx}
         ${tenantFilterDrive}
         ${driveEmployerSql}
         ${driveExcludeDemoSql}
       ORDER BY d.created_at DESC
       LIMIT 15`,
      [...params, driveMarkerParam],
    ),
    query(
      `SELECT pa.id, jp.title, jp.job_type, u.email, pa.status, pa.applied_at
       FROM program_applications pa
       JOIN job_postings jp ON jp.id = pa.job_id
       JOIN employer_profiles ep ON ep.id = jp.employer_id
       JOIN users eu ON eu.id = ep.user_id
       JOIN student_profiles sp ON sp.id = pa.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE COALESCE(pa.is_deleted, false) = false
         AND COALESCE(jp.is_deleted, false) = false
         AND u.email ILIKE '%@${DEMO_EMAIL_DOMAIN}'
         ${tenantFilter}
         ${progEmployerSql}
         ${progExcludeDemoSql}
       ORDER BY pa.applied_at DESC
       LIMIT 15`,
      progParams,
    ),
    query(
      `SELECT a.id, d.title, u.email, a.status, a.applied_at
       FROM applications a
       JOIN placement_drives d ON d.id = a.drive_id
       JOIN employer_profiles ep ON ep.id = d.employer_id
       JOIN users eu ON eu.id = ep.user_id
       JOIN student_profiles sp ON sp.id = a.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE COALESCE(a.is_deleted, false) = false
         AND COALESCE(d.is_deleted, false) = false
         AND u.email ILIKE '%@${DEMO_EMAIL_DOMAIN}'
         ${tenantFilter}
         ${driveAppEmployerSql}
         ${driveAppExcludeDemoSql}
       ORDER BY a.applied_at DESC
       LIMIT 15`,
      driveAppParams,
    ),
  ]);

  const mapStudent = (r) => ({
    entityType: 'student',
    entityId: r.id,
    label: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email,
    sub: r.email,
    at: r.created_at,
  });
  const mapJobPosting = (r, entityType) => ({
    entityType,
    entityId: r.id,
    label: r.title,
    sub: `${r.job_type} · ${purgeableJobSource(r)}`,
    at: r.created_at,
  });
  const mapDrive = (r) => ({
    entityType: 'drive',
    entityId: r.id,
    label: r.title,
    sub: r.status,
    at: r.created_at,
  });
  const mapProg = (r) => ({
    entityType: 'program_application',
    entityId: r.id,
    label: r.title,
    sub: `${r.email} · ${r.job_type || 'program'} · ${r.status}`,
    at: r.applied_at,
  });
  const mapDriveApp = (r) => ({
    entityType: 'drive_application',
    entityId: r.id,
    label: r.title,
    sub: `${r.email} · ${r.status}`,
    at: r.applied_at,
  });

  return {
    students: students.rows.map(mapStudent),
    jobs: jobsRes.rows.map((r) => mapJobPosting(r, 'job')),
    internships: internshipsRes.rows.map((r) => mapJobPosting(r, 'internship')),
    drives: drives.rows.map(mapDrive),
    programApplications: progApps.rows.map(mapProg),
    driveApplications: driveApps.rows.map(mapDriveApp),
  };
}

const ALL_JOB_AND_PROGRAM_TYPES = [...JOB_KIND_TYPES.job, ...JOB_KIND_TYPES.internship];

/**
 * Soft-delete every job and internship/program posting (all employers).
 * Cascades program applications, linked drives, offers, and assessments.
 * Always permanently deletes all in-app alerts (inbox + trash).
 */
export async function purgeAllJobsAndInternships(audit = {}) {
  return transaction(async (client) => {
    const jobRows = (
      await client.query(
        `SELECT id, title, job_type
         FROM job_postings
         WHERE COALESCE(is_deleted, false) = false
           AND job_type = ANY($1::text[])`,
        [ALL_JOB_AND_PROGRAM_TYPES],
      )
    ).rows;

    const summary = {
      jobs: 0,
      internships: 0,
      programApplications: 0,
      drives: 0,
      driveApplications: 0,
      offers: 0,
      assessments: 0,
      alertsDeleted: 0,
    };

    summary.alertsDeleted = await deleteAllAlerts(client);

    if (!jobRows.length) {
      return {
        ok: true,
        action: 'purge-all-jobs-internships',
        deleted: 0,
        summary,
        message:
          summary.alertsDeleted > 0
            ? `No jobs or internships to delete. Cleared ${summary.alertsDeleted} alert(s).`
            : 'No jobs, internships, or alerts to delete.',
      };
    }

    const jobIds = jobRows.map((r) => r.id);
    summary.jobs = jobRows.filter((r) => JOB_KIND_TYPES.job.includes(r.job_type)).length;
    summary.internships = jobRows.filter((r) => JOB_KIND_TYPES.internship.includes(r.job_type)).length;

    const driveRows = (
      await client.query(
        `SELECT id, title, tenant_id, drive_date, job_id
         FROM placement_drives
         WHERE job_id = ANY($1::uuid[])
           AND COALESCE(is_deleted, false) = false`,
        [jobIds],
      )
    ).rows;
    const driveIds = driveRows.map((r) => r.id);

    summary.programApplications = await markDeleted(
      client,
      'program_applications',
      'job_id = ANY($1::uuid[])',
      [jobIds],
    );

    if (driveIds.length) {
      summary.drives = await markDeleted(client, 'placement_drives', 'id = ANY($1::uuid[])', [driveIds]);
      summary.driveApplications = await markDeleted(
        client,
        'applications',
        'drive_id = ANY($1::uuid[]) OR job_id = ANY($2::uuid[])',
        [driveIds, jobIds],
      );
      summary.offers = await markDeleted(client, 'offers', 'drive_id = ANY($1::uuid[])', [driveIds]);
      summary.assessments = await markDeleted(
        client,
        'employer_assessment_uploads',
        'drive_id = ANY($1::uuid[]) OR job_id = ANY($2::uuid[])',
        [driveIds, jobIds],
        { touchUpdatedAt: false },
      );
    } else {
      summary.driveApplications = await markDeleted(client, 'applications', 'job_id = ANY($1::uuid[])', [jobIds]);
      summary.assessments = await markDeleted(
        client,
        'employer_assessment_uploads',
        'job_id = ANY($1::uuid[])',
        [jobIds],
        { touchUpdatedAt: false },
      );
    }

    await markDeleted(client, 'job_postings', 'id = ANY($1::uuid[])', [jobIds]);

    await writePurgeAuditLog(client, audit, {
      entityType: 'bulk_jobs_internships',
      entityId: jobIds[0],
      label: `Bulk purge ${jobIds.length} job/internship postings`,
      cascade: summary,
      transactionId: null,
      tenantId: audit?.tenantId || null,
    });

    return {
      ok: true,
      action: 'purge-all-jobs-internships',
      deleted: jobIds.length,
      summary,
      jobIds,
    };
  });
}
