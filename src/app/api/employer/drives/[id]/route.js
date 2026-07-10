import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { fetchCollegeAdminUserIds, notifyUsersOneAtATime } from '@/lib/notificationService';
import { findAcademicYearForDate } from '@/lib/academicYearTenant';
import { AND_DRIVE_NOT_DELETED } from '@/lib/softDeleteSql';
import { DRIVE_APPLICANT_COUNT_SUBQUERY } from '@/lib/employerApplicationCounts';
import { validateEmployerDriveDate, validateTitlePayload } from '@/lib/apiInputValidation';
import { normalizeTitle } from '@/lib/validators';
import {
  mapDriveJobFieldsFromRow,
  parsePlacementDriveJobPayload,
  PLACEMENT_DRIVE_JOB_SELECT_SQL,
} from '@/lib/placementDriveJobFields';
import {
  buildPlatformErrorResponse,
  PLATFORM_ERROR_CONTEXT,
} from '@/lib/platformErrorLog';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

const EDITABLE_STATUSES = new Set(['requested', 'approved', 'scheduled', 'in_progress']);
const ALLOWED_TYPES = new Set(['on_campus', 'off_campus', 'virtual', 'hybrid']);

async function getEmployerId(userId) {
  const r = await query(`SELECT id, company_name FROM employer_profiles WHERE user_id = $1::uuid`, [userId]);
  return r.rows[0] || null;
}

async function loadEmployerDrive(driveId, employerId) {
  const baseSelect = `
    SELECT d.id, d.tenant_id, t.name AS college, d.title AS role, d.description, d.notes,
           d.drive_date AS date, d.drive_type AS type, d.status, d.venue,
           ${DRIVE_APPLICANT_COUNT_SUBQUERY} AS registered`;
  const baseFrom = `
    FROM placement_drives d
    JOIN tenants t ON t.id = d.tenant_id
    WHERE d.id = $1::uuid AND d.employer_id = $2::uuid ${AND_DRIVE_NOT_DELETED}`;

  const tiers = [
    `${baseSelect}, d.ctc_breakup, d.min_cgpa,${PLACEMENT_DRIVE_JOB_SELECT_SQL}`,
    `${baseSelect}, d.ctc_breakup, d.min_cgpa`,
    `${baseSelect}, d.ctc_breakup`,
    `${baseSelect}, d.min_cgpa`,
    baseSelect,
  ];

  let lastErr = null;
  for (const select of tiers) {
    try {
      const res = await query(`${select} ${baseFrom}`, [driveId, employerId]);
      const row = res.rows[0];
      if (!row) return null;
      return {
        ...row,
        ...mapDriveJobFieldsFromRow(row),
        ctc_breakup: row.ctc_breakup ?? null,
        min_cgpa: row.min_cgpa ?? null,
      };
    } catch (err) {
      if (err?.code !== '42703') throw err;
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to load drive');
}

async function __platform_GET(_request, { params }) {
  let session = null;
  let emp = null;
  let driveId = null;

  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    emp = await getEmployerId(session.user.id);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    ({ id: driveId } = await params);
    if (!driveId) return NextResponse.json({ error: 'Drive id required' }, { status: 400 });

    const drive = await loadEmployerDrive(driveId, emp.id);
    if (!drive) return NextResponse.json({ error: 'Drive not found' }, { status: 404 });

    return NextResponse.json({ drive });
  } catch (e) {
    console.error('GET /api/employer/drives/[id]', e);
    const { status, body: errBody } = await buildPlatformErrorResponse(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_GET,
      request: _request,
      sessionUser: session?.user,
      employerId: emp?.id || null,
      requestBody: driveId ? { driveId } : null,
      defaultMessage: 'Failed to load drive',
    });
    return NextResponse.json(errBody, { status });
  }
}

async function __platform_PATCH(request, { params }) {
  let session = null;
  let emp = null;
  let body = {};
  let driveId = null;

  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    emp = await getEmployerId(session.user.id);
    if (!emp) return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });

    ({ id: driveId } = await params);
    if (!driveId) return NextResponse.json({ error: 'Drive id required' }, { status: 400 });

    body = await request.json().catch(() => ({}));
    const {
      title,
      description = '',
      notes: notesIn = '',
      driveType = 'on_campus',
      driveDate = null,
      venue: venueIn,
      ctcBreakup: ctcBreakupIn,
    } = body;

    const titleNormalized = normalizeTitle(title);
    if (!titleNormalized) {
      return NextResponse.json({ error: 'Drive title is required' }, { status: 400 });
    }
    const titleErr = validateTitlePayload(titleNormalized, { label: 'Drive title' });
    if (titleErr) {
      return NextResponse.json({ error: titleErr }, { status: 400 });
    }
    const driveDateErr = validateEmployerDriveDate(driveDate);
    if (driveDateErr) {
      return NextResponse.json({ error: driveDateErr }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(driveType)) {
      return NextResponse.json({ error: 'Invalid driveType' }, { status: 400 });
    }

    const jobParsed = parsePlacementDriveJobPayload(body);
    if (jobParsed.error) {
      return NextResponse.json({ error: jobParsed.error }, { status: 400 });
    }
    const job = jobParsed.value;

    const venue =
      typeof venueIn === 'string' && venueIn.trim().length > 0 ? venueIn.trim() : null;
    const ctcBreakupRaw = ctcBreakupIn != null ? String(ctcBreakupIn) : '';
    const ctcBreakup =
      ctcBreakupRaw.trim().length > 0 ? ctcBreakupRaw.trim().slice(0, 10000) : null;
    const notesRaw = notesIn != null ? String(notesIn) : '';
    const notes = notesRaw.trim().length > 0 ? notesRaw.trim().slice(0, 10000) : null;

    const result = await transaction(async (client) => {
      const meta = await client.query(
        `SELECT d.id, d.title, d.status, d.tenant_id, t.name AS college_name
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
      if (!EDITABLE_STATUSES.has(row.status)) {
        const e = new Error(`Cannot edit a drive that is ${String(row.status).replace(/_/g, ' ')}.`);
        e.statusCode = 409;
        throw e;
      }

      let academicYearId = null;
      if (driveDate) {
        const yearsRes = await client.query(
          `SELECT id, period_start, period_end FROM tenant_academic_years WHERE tenant_id = $1::uuid`,
          [row.tenant_id],
        );
        const match = findAcademicYearForDate(driveDate, yearsRes.rows);
        academicYearId = match?.id || null;
      }

      const updateValues = [
        titleNormalized,
        description || '',
        driveType,
        driveDate || null,
        venue,
        notes,
        academicYearId,
        driveId,
        emp.id,
      ];

      const updateAttempts = [
        {
          sql: `UPDATE placement_drives
           SET title = $1,
               description = $2,
               drive_type = $3,
               drive_date = $4::date,
               venue = $5,
               notes = $6,
               ctc_breakup = $7,
               min_cgpa = $8,
               job_type = $9,
               salary_min = $10,
               salary_max = $11,
               eligible_branches = $12::text[],
               max_backlogs = $13,
               batch_year = $14,
               skills_required = $15::text[],
               additional_info = $16,
               application_deadline = $17::timestamp,
               min_tenth_pct = $18,
               min_twelfth_pct = $19,
               locations = $20::text[],
               max_students = COALESCE($21, max_students),
               academic_year_id = $22::uuid,
               updated_at = NOW()
           WHERE id = $23::uuid AND employer_id = $24::uuid
           RETURNING id, title AS role, drive_date AS date, drive_type AS type, status, venue,
                     registered_count AS registered, description, notes, ctc_breakup, min_cgpa,
                     job_type, salary_min, salary_max, eligible_branches, max_backlogs, batch_year,
                     skills_required, additional_info, application_deadline, min_tenth_pct, min_twelfth_pct,
                     locations, max_students`,
          values: [
            ...updateValues.slice(0, 6),
            ctcBreakup,
            job.minCgpa,
            job.jobType,
            job.salaryMin,
            job.salaryMax,
            job.eligibleBranches,
            job.maxBacklogs,
            job.batchYear,
            job.skillsRequired,
            job.additionalInfo,
            job.applicationDeadline,
            job.minTenthPct,
            job.minTwelfthPct,
            job.locations,
            job.maxStudents,
            ...updateValues.slice(6),
          ],
        },
        {
          sql: `UPDATE placement_drives
           SET title = $1,
               description = $2,
               drive_type = $3,
               drive_date = $4::date,
               venue = $5,
               notes = $6,
               ctc_breakup = $7,
               min_cgpa = $8,
               academic_year_id = $9::uuid,
               updated_at = NOW()
           WHERE id = $10::uuid AND employer_id = $11::uuid
           RETURNING id, title AS role, drive_date AS date, drive_type AS type, status, venue,
                     registered_count AS registered, description, notes, ctc_breakup, min_cgpa`,
          values: [...updateValues.slice(0, 6), ctcBreakup, job.minCgpa, ...updateValues.slice(6)],
        },
        {
          sql: `UPDATE placement_drives
           SET title = $1,
               description = $2,
               drive_type = $3,
               drive_date = $4::date,
               venue = $5,
               notes = $6,
               ctc_breakup = $7,
               academic_year_id = $8::uuid,
               updated_at = NOW()
           WHERE id = $9::uuid AND employer_id = $10::uuid
           RETURNING id, title AS role, drive_date AS date, drive_type AS type, status, venue,
                     registered_count AS registered, description, notes, ctc_breakup`,
          values: [...updateValues.slice(0, 6), ctcBreakup, ...updateValues.slice(6)],
        },
        {
          sql: `UPDATE placement_drives
           SET title = $1,
               description = $2,
               drive_type = $3,
               drive_date = $4::date,
               venue = $5,
               notes = $6,
               min_cgpa = $7,
               academic_year_id = $8::uuid,
               updated_at = NOW()
           WHERE id = $9::uuid AND employer_id = $10::uuid
           RETURNING id, title AS role, drive_date AS date, drive_type AS type, status, venue,
                     registered_count AS registered, description, notes, min_cgpa`,
          values: [...updateValues.slice(0, 6), job.minCgpa, ...updateValues.slice(6)],
        },
        {
          sql: `UPDATE placement_drives
           SET title = $1,
               description = $2,
               drive_type = $3,
               drive_date = $4::date,
               venue = $5,
               notes = $6,
               academic_year_id = $7::uuid,
               updated_at = NOW()
           WHERE id = $8::uuid AND employer_id = $9::uuid
           RETURNING id, title AS role, drive_date AS date, drive_type AS type, status, venue,
                     registered_count AS registered, description, notes`,
          values: updateValues,
        },
      ];

      let updated;
      let lastUpdateErr = null;
      for (const attempt of updateAttempts) {
        try {
          updated = await client.query(attempt.sql, attempt.values);
          break;
        } catch (err) {
          if (err?.code !== '42703') throw err;
          lastUpdateErr = err;
        }
      }
      if (!updated) throw lastUpdateErr || new Error('Failed to update drive');

      const adminIds = await fetchCollegeAdminUserIds(row.tenant_id, client);
      await notifyUsersOneAtATime(
        adminIds,
        {
          title: `${emp.company_name} updated a drive`,
          message: `${emp.company_name} updated the placement drive "${titleNormalized}". Review the latest details in Drives.`,
          type: 'drive',
          link: '/dashboard/college/drives',
        },
        client,
      );

      return {
        ok: true,
        drive: {
          ...updated.rows[0],
          ...mapDriveJobFieldsFromRow(updated.rows[0]),
          college: row.college_name,
          ctc_breakup: updated.rows[0].ctc_breakup ?? null,
          min_cgpa: updated.rows[0].min_cgpa ?? null,
          notes: updated.rows[0].notes ?? null,
        },
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error('PATCH /api/employer/drives/[id]', e);
    const { status, body: errBody } = await buildPlatformErrorResponse(e, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DRIVE_UPDATE,
      request,
      sessionUser: session?.user,
      employerId: emp?.id || null,
      requestBody: { ...body, driveId },
      defaultMessage: 'Failed to update drive',
    });
    return NextResponse.json(errBody, { status });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  PATCH: __platform_PATCH,
}, { context: 'api_employer_drives_id' });
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
