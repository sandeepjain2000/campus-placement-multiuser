import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { fetchCollegeAdminUserIds, notifyUsersOneAtATime } from '@/lib/notificationService';
import { emailPlacementDriveRequested } from '@/lib/placementDriveEmail';
import { findAcademicYearForDate } from '@/lib/academicYearTenant';
import { AND_DRIVE_NOT_DELETED } from '@/lib/softDeleteSql';
import { placementDriveNotDeletedSql } from '@/lib/migrationReady';
import { validateEmployerDriveDate, validateTitlePayload } from '@/lib/apiInputValidation';
import { normalizeTitle } from '@/lib/validators';
import {
  mapDriveJobFieldsFromRow,
  parsePlacementDriveJobPayload,
  PLACEMENT_DRIVE_JOB_SELECT_SQL,
} from '@/lib/placementDriveJobFields';
import {
  sqlDriveAcademicYearFilter,
} from '@/lib/employerAcademicYear';
import { assertTenantAllowedForPostingCategory } from '@/lib/employerPostingCampusConstraints';
import {
  buildPlatformErrorResponse,
  PLATFORM_ERROR_CONTEXT,
} from '@/lib/platformErrorLog';
import { DRIVE_APPLICANT_COUNT_SUBQUERY } from '@/lib/employerApplicationCounts';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function getEmployerId(userId) {
  const r = await query(`SELECT id, company_name FROM employer_profiles WHERE user_id = $1::uuid`, [userId]);
  return r.rows[0] || null;
}

async function resolveDriveAcademicYearId(client, tenantId, driveDate) {
  if (!driveDate) return null;
  try {
    const yearsRes = await client.query(
      `SELECT id, period_start, period_end FROM tenant_academic_years WHERE tenant_id = $1::uuid`,
      [tenantId],
    );
    const match = findAcademicYearForDate(driveDate, yearsRes.rows);
    return match?.id || null;
  } catch (err) {
    if (err?.code === '42P01' || err?.code === '42703') return null;
    console.warn('Academic year lookup skipped for drive request:', err.message);
    return null;
  }
}

async function notifyCollegeAdminsDriveRequest(client, adminIds, payload) {
  try {
    await notifyUsersOneAtATime(adminIds, { ...payload, type: 'drive' }, client);
  } catch (err) {
    if (err?.code !== '23514') throw err;
    await notifyUsersOneAtATime(adminIds, { ...payload, type: 'info' }, client);
  }
}

function isMissingColumnError(err) {
  return err?.code === '42703';
}

/** Insert drive request; omits optional columns when not migrated yet. */
async function insertPlacementDriveRequest(client, params) {
  const {
    tenantId,
    employerId,
    title,
    description,
    notes,
    driveType,
    driveDate,
    venue,
    ctcBreakup,
    minCgpa,
    academicYearId,
    jobType,
    salaryMin,
    salaryMax,
    maxStudents,
    eligibleBranches,
    maxBacklogs,
    batchYear,
    skillsRequired,
    additionalInfo,
    applicationDeadline,
    minTenthPct,
    minTwelfthPct,
    locations,
  } = params;

  const maxStudentsResolved = maxStudents != null ? maxStudents : 100;

  const baseValues = [
    tenantId,
    employerId,
    null,
    title,
    description || '',
    driveType,
    driveDate || null,
    venue,
    notes || null,
    academicYearId,
  ];

  const jobValues = [
    jobType || 'full_time',
    salaryMin,
    salaryMax,
    eligibleBranches,
    maxBacklogs,
    batchYear,
    skillsRequired,
    additionalInfo,
    applicationDeadline,
    minTenthPct,
    minTwelfthPct,
    locations,
  ];

  const attempts = [
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, notes, ctc_breakup, min_cgpa,
         job_type, salary_min, salary_max, eligible_branches, max_backlogs, batch_year,
         skills_required, additional_info, application_deadline, min_tenth_pct, min_twelfth_pct, locations,
         status, max_students, registered_count, academic_year_id
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, $9, $10, $11,
         $12, $13, $14, $15::text[], $16, $17,
         $18::text[], $19, $20::timestamp, $21, $22, $23::text[],
         'requested', $24, 0, $25::uuid
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [
        ...baseValues.slice(0, 8),
        baseValues[8],
        ctcBreakup,
        minCgpa,
        ...jobValues,
        maxStudentsResolved,
        baseValues[9],
      ],
    },
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, notes, ctc_breakup, min_cgpa, status, max_students, registered_count,
         academic_year_id
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, $9, $10, $11, 'requested', $12, 0, $13::uuid
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [...baseValues.slice(0, 8), baseValues[8], ctcBreakup, minCgpa, maxStudentsResolved, baseValues[9]],
    },
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, notes, ctc_breakup, status, max_students, registered_count,
         academic_year_id
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, $9, $10, 'requested', $11, 0, $12::uuid
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [...baseValues.slice(0, 8), baseValues[8], ctcBreakup, maxStudentsResolved, baseValues[9]],
    },
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, notes, min_cgpa, status, max_students, registered_count,
         academic_year_id
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, $9, $10, 'requested', $11, 0, $12::uuid
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [...baseValues.slice(0, 8), baseValues[8], minCgpa, maxStudentsResolved, baseValues[9]],
    },
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, notes, status, max_students, registered_count,
         academic_year_id
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, $9, 'requested', $10, 0, $11::uuid
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [...baseValues.slice(0, 8), baseValues[8], maxStudentsResolved, baseValues[9]],
    },
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, notes, ctc_breakup, min_cgpa, status, max_students, registered_count
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, $9, $10, $11, 'requested', $12, 0
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [...baseValues.slice(0, 8), baseValues[8], ctcBreakup, minCgpa, maxStudentsResolved],
    },
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, notes, ctc_breakup, status, max_students, registered_count
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, $9, $10, 'requested', $11, 0
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [...baseValues.slice(0, 8), baseValues[8], ctcBreakup, maxStudentsResolved],
    },
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, notes, min_cgpa, status, max_students, registered_count
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, $9, $10, 'requested', $11, 0
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [...baseValues.slice(0, 8), baseValues[8], minCgpa, maxStudentsResolved],
    },
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, notes, status, max_students, registered_count
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, $9, 'requested', $10, 0
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [...baseValues.slice(0, 8), baseValues[8], maxStudentsResolved],
    },
    {
      sql: `INSERT INTO placement_drives (
         tenant_id, employer_id, job_id, title, description, drive_type, drive_date,
         start_time, end_time, venue, status, max_students, registered_count
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::date,
         NULL, NULL, $8, 'requested', $9, 0
       )
       RETURNING id, title, drive_date, tenant_id`,
      values: [...baseValues.slice(0, 8), maxStudentsResolved],
    },
  ];

  let lastErr = null;
  for (const { sql, values } of attempts) {
    await client.query('SAVEPOINT drive_insert_attempt');
    try {
      const ins = await client.query(sql, values);
      await client.query('RELEASE SAVEPOINT drive_insert_attempt');
      return {
        row: ins.rows[0],
        ctcBreakupStored: sql.includes('ctc_breakup') ? ctcBreakup : null,
        minCgpaStored: sql.includes('min_cgpa') ? minCgpa : null,
      };
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT drive_insert_attempt');
      if (!isMissingColumnError(err)) throw err;
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to insert placement drive');
}

async function queryEmployerDriveList(baseSelect, baseFrom, params, { driveDelSql = '', academicYearId = null } = {}) {
  const yearFilter = academicYearId ? sqlDriveAcademicYearFilter('d', params.length + 1) : '';
  const yearParams = academicYearId ? [...params, academicYearId] : params;
  const tiers = [
    `${baseSelect}, d.ctc_breakup AS ctc_breakup, d.min_cgpa AS min_cgpa,${PLACEMENT_DRIVE_JOB_SELECT_SQL}`,
    `${baseSelect}, d.ctc_breakup AS ctc_breakup, d.min_cgpa AS min_cgpa`,
    `${baseSelect}, d.ctc_breakup AS ctc_breakup`,
    `${baseSelect}, d.min_cgpa AS min_cgpa`,
    baseSelect,
  ];

  let lastErr = null;
  for (const select of tiers) {
    try {
      let fromWithYear = baseFrom;
      if (yearFilter) {
        fromWithYear = driveDelSql
          ? baseFrom.replace(driveDelSql, `${driveDelSql}${yearFilter}`)
          : `${baseFrom}${yearFilter}`;
      }
      const res = await query(`${select} ${fromWithYear}`, yearParams);
      return res.rows.map((r) => ({
        ...r,
        ...mapDriveJobFieldsFromRow(r),
        ctc_breakup: r.ctc_breakup ?? null,
        min_cgpa: r.min_cgpa ?? null,
      }));
    } catch (err) {
      if (err?.code !== '42703') throw err;
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to load drives');
}

async function __platform_GET(request) {
  let session = null;
  let emp = null;
  let campusId = null;

  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    emp = await getEmployerId(session.user.id);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    campusId = searchParams.get('campusId') || null;

    const driveDelSql = await placementDriveNotDeletedSql('d');

    const baseSelect = `
      SELECT d.id, d.tenant_id, t.name AS college, d.title AS role, d.description, d.notes,
             d.drive_date AS date, d.drive_type AS type,
             d.status, d.venue, ${DRIVE_APPLICANT_COUNT_SUBQUERY} AS registered`;
    const baseFrom = `
      FROM placement_drives d
      JOIN tenants t ON t.id = d.tenant_id
      WHERE d.employer_id = $1::uuid
        AND ($2::uuid IS NULL OR d.tenant_id = $2::uuid)
        ${driveDelSql}
      ORDER BY d.drive_date NULLS LAST, d.created_at DESC`;
    const params = [emp.id, campusId];

    const rows = await queryEmployerDriveList(baseSelect, baseFrom, params, {
      driveDelSql,
      academicYearId: null,
    });

    return NextResponse.json({ drives: rows, companyName: emp.company_name });
  } catch (e) {
    console.error('GET /api/employer/drives', e);
    const { status, body: errBody } = await buildPlatformErrorResponse(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_LIST,
      request,
      sessionUser: session?.user,
      tenantId: campusId,
      employerId: emp?.id || null,
      defaultMessage: 'Failed to load placement drives',
    });
    return NextResponse.json(errBody, { status });
  }
}


async function __platform_POST(request) {
  let body = {};
  let session = null;
  let emp = null;
  let tenantId = null;

  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    emp = await getEmployerId(session.user.id);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    body = await request.json().catch(() => ({}));
    tenantId = body.tenantId || null;
    const {
      title,
      description = '',
      notes: notesIn = '',
      driveType = 'on_campus',
      driveDate = null,
      venue: venueIn,
      ctcBreakup: ctcBreakupIn,
    } = body;
    const venue =
      typeof venueIn === 'string' && venueIn.trim().length > 0 ? venueIn.trim() : null;
    const ctcBreakupRaw = ctcBreakupIn != null ? String(ctcBreakupIn) : '';
    const ctcBreakup =
      ctcBreakupRaw.trim().length > 0 ? ctcBreakupRaw.trim().slice(0, 10000) : null;
    const notesRaw = notesIn != null ? String(notesIn) : '';
    const notes = notesRaw.trim().length > 0 ? notesRaw.trim().slice(0, 10000) : null;

    const titleNormalized = normalizeTitle(title);
    if (!tenantId || !titleNormalized) {
      return NextResponse.json({ error: 'tenantId and title are required' }, { status: 400 });
    }
    const titleErr = validateTitlePayload(titleNormalized, { label: 'Drive title' });
    if (titleErr) {
      return NextResponse.json({ error: titleErr }, { status: 400 });
    }

    const driveDateErr = validateEmployerDriveDate(driveDate);
    if (driveDateErr) {
      return NextResponse.json({ error: driveDateErr }, { status: 400 });
    }

    const allowedTypes = new Set(['on_campus', 'off_campus', 'virtual', 'hybrid']);
    if (!allowedTypes.has(driveType)) {
      return NextResponse.json({ error: 'Invalid driveType' }, { status: 400 });
    }

    const jobParsed = parsePlacementDriveJobPayload(body);
    if (jobParsed.error) {
      return NextResponse.json({ error: jobParsed.error }, { status: 400 });
    }
    const job = jobParsed.value;

    const result = await transaction(async (client) => {
      const ok = await client.query(
        `SELECT 1 FROM employer_approvals
         WHERE tenant_id = $1::uuid AND employer_id = $2::uuid AND status = 'approved'`,
        [tenantId, emp.id],
      );
      if (!ok.rowCount) {
        const e = new Error('No approved partnership with this campus');
        e.statusCode = 403;
        throw e;
      }

      const campusLimit = await assertTenantAllowedForPostingCategory(client, emp.id, tenantId, 'drives');
      if (!campusLimit.ok) {
        const e = new Error(campusLimit.error);
        e.statusCode = 403;
        throw e;
      }

      let academicYearId = await resolveDriveAcademicYearId(client, tenantId, driveDate);

      const { row, ctcBreakupStored, minCgpaStored } = await insertPlacementDriveRequest(client, {
        tenantId,
        employerId: emp.id,
        title: titleNormalized,
        description,
        notes,
        driveType,
        driveDate,
        venue,
        ctcBreakup,
        minCgpa: job.minCgpa,
        academicYearId,
        jobType: job.jobType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        maxStudents: job.maxStudents,
        eligibleBranches: job.eligibleBranches,
        maxBacklogs: job.maxBacklogs,
        batchYear: job.batchYear,
        skillsRequired: job.skillsRequired,
        additionalInfo: job.additionalInfo,
        applicationDeadline: job.applicationDeadline,
        minTenthPct: job.minTenthPct,
        minTwelfthPct: job.minTwelfthPct,
        locations: job.locations,
      });
      const college = await client.query(`SELECT name FROM tenants WHERE id = $1::uuid`, [tenantId]);
      const collegeName = college.rows[0]?.name || 'your campus';

      const adminIds = await fetchCollegeAdminUserIds(tenantId, client);
      const dateLabel = row.drive_date
        ? new Date(row.drive_date).toLocaleDateString(undefined, { dateStyle: 'medium' })
        : 'date TBD';

      await notifyCollegeAdminsDriveRequest(
        client,
        adminIds,
        {
          title: `${emp.company_name} requested a drive`,
          message: `${emp.company_name} submitted a placement drive request: "${row.title}" (${dateLabel}, ${driveType.replace('_', ' ')}). Review and approve in Drives.`,
          link: '/dashboard/college/drives',
        },
      );

      return {
        ok: true,
        drive: {
          id: row.id,
          college: collegeName,
          role: row.title,
          date: row.drive_date,
          type: driveType,
          status: 'requested',
          registered: 0,
          venue,
          ctcBreakup: ctcBreakupStored,
          minCgpa: minCgpaStored,
        },
      };
    });

    if (result?.ok && result?.drive) {
      const d = result.drive;
      const dateLabel = d.date
        ? new Date(d.date).toLocaleDateString(undefined, { dateStyle: 'medium' })
        : 'date TBD';
      void emailPlacementDriveRequested({
        companyName: emp.company_name,
        driveTitle: d.role || d.title || 'Untitled',
        collegeName: d.college,
        driveDateLabel: dateLabel,
        driveType: d.type,
        driveId: d.id,
      }).catch((err) => console.error('[mail] placement drive requested', err));
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/employer/drives', e);
    const { status, body: errBody } = await buildPlatformErrorResponse(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_CREATE,
      request,
      sessionUser: session?.user,
      tenantId,
      employerId: emp?.id || null,
      requestBody: body,
      defaultMessage: 'Failed to create drive',
    });
    return NextResponse.json(errBody, { status });
  }
}

const EMPLOYER_CANCELLABLE_STATUSES = new Set(['requested', 'approved', 'scheduled', 'in_progress']);

async function __platform_PATCH(request) {
  let session = null;
  let emp = null;
  let body = {};

  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    emp = await getEmployerId(session.user.id);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    body = await request.json().catch(() => ({}));
    const { driveId, action } = body;

    if (action !== 'cancel') {
      return NextResponse.json({ error: 'driveId and action=cancel are required' }, { status: 400 });
    }
    if (!driveId) {
      return NextResponse.json({ error: 'driveId is required' }, { status: 400 });
    }

    const result = await transaction(async (client) => {
      const meta = await client.query(
        `SELECT d.id, d.title, d.status, d.tenant_id, d.registered_count, t.name AS college_name
         FROM placement_drives d
         JOIN tenants t ON t.id = d.tenant_id
         WHERE d.id = $1::uuid AND d.employer_id = $2::uuid ${AND_DRIVE_NOT_DELETED}`,
        [driveId, emp.id],
      );
      if (!meta.rows.length) {
        const e = new Error('Drive not found');
        e.statusCode = 404;
        throw e;
      }

      const row = meta.rows[0];
      if (row.status === 'cancelled') {
        const e = new Error('This drive is already cancelled.');
        e.statusCode = 409;
        throw e;
      }
      if (!EMPLOYER_CANCELLABLE_STATUSES.has(row.status)) {
        const e = new Error(`Cannot cancel a drive that is ${String(row.status).replace(/_/g, ' ')}.`);
        e.statusCode = 409;
        throw e;
      }

      const updated = await client.query(
        `UPDATE placement_drives
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1::uuid AND employer_id = $2::uuid
         RETURNING id, title AS role, drive_date AS date, drive_type AS type, status, venue, registered_count AS registered`,
        [driveId, emp.id],
      );

      const adminIds = await fetchCollegeAdminUserIds(row.tenant_id, client);
      const regNote = row.registered_count > 0 ? ` (${row.registered_count} student(s) had registered)` : '';
      await notifyUsersOneAtATime(
        adminIds,
        {
          title: `${emp.company_name} cancelled a drive`,
          message: `${emp.company_name} cancelled the placement drive "${row.title}"${regNote}.`,
          type: 'drive',
          link: '/dashboard/college/drives',
        },
        client,
      );

      return {
        ok: true,
        drive: {
          ...updated.rows[0],
          college: row.college_name,
        },
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error('PATCH /api/employer/drives', e);
    const { status, body: errBody } = await buildPlatformErrorResponse(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_CANCEL,
      request,
      sessionUser: session?.user,
      employerId: emp?.id || null,
      requestBody: body,
      defaultMessage: 'Failed to cancel drive',
    });
    return NextResponse.json(errBody, { status });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
  PATCH: __platform_PATCH,
}, { context: 'api_employer_drives' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
export const PATCH = __platformApiHandlers.PATCH;
