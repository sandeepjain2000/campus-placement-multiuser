import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { fetchCollegeAdminUserIds, notifyUsersOneAtATime } from '@/lib/notificationService';
import { AND_DRIVE_PD_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import {
  INSTITUTION_CLASSIFICATION_SELECT_SQL,
  mapInstitutionClassificationsFromRow,
} from '@/lib/tenantInstitutionClassifications';
import { loadEmployerPostingCampusConstraints } from '@/lib/employerPostingCampusConstraints';
import { respondPlatformError , withApiHandlers } from '@/lib/platformErrorRoute';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function serializeCollegeRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    state: row.state,
    email: row.email,
    phone: row.phone,
    logo_url: row.logo_url,
    naac_grade: row.naac_grade,
    nirf_rank: row.nirf_rank,
    accreditation: row.accreditation,
    website: row.website,
    total_students: Number(row.total_students) || 0,
    placed_students: Number(row.placed_students) || 0,
    avg_cgpa: row.avg_cgpa != null ? Number(row.avg_cgpa) : null,
    approval_status: row.approval_status != null ? String(row.approval_status).trim() : null,
    requested_at: row.requested_at ?? null,
    approved_at: row.approved_at ?? null,
    active_drives: Number(row.active_drives) || 0,
    institutionClassifications: mapInstitutionClassificationsFromRow(row),
  };
}

async function resolveEmployer(session) {
  const userId = session.user.id || session.user.sub;
  const email = String(session.user.email || '').trim().toLowerCase();
  if (!userId && !email) return null;

  const empResult = await query(
    `SELECT ep.id, ep.company_name
     FROM employer_profiles ep
     JOIN users u ON u.id = ep.user_id
     WHERE ($1::text IS NOT NULL AND u.id::text = $1::text)
        OR ($2::text <> '' AND LOWER(u.email) = $2)
     LIMIT 1`,
    [userId || null, email],
  );
  return empResult.rows[0] || null;
}

async function fetchCollegesDetailed(employerId) {
  const result = await query(
    `SELECT
        t.id,
        t.name,
        t.slug,
        t.city,
        t.state,
        t.email,
        t.phone,
        t.logo_url,
        t.naac_grade,
        t.nirf_rank,
        t.accreditation,
        t.website,
        ${INSTITUTION_CLASSIFICATION_SELECT_SQL},
        COUNT(DISTINCT sp.id) AS total_students,
        COUNT(DISTINCT sp.id) FILTER (WHERE sp.placement_status = 'placed') AS placed_students,
        ROUND(AVG(sp.cgpa), 2) AS avg_cgpa,
        ea.status AS approval_status,
        ea.created_at AS requested_at,
        ea.approved_at,
        COUNT(DISTINCT pd.id) FILTER (WHERE pd.status IN ('scheduled','approved','in_progress')) AS active_drives
     FROM tenants t
     LEFT JOIN student_profiles sp ON sp.tenant_id = t.id AND ${SP_ACTIVE_CLAUSE}
     LEFT JOIN employer_approvals ea ON ea.tenant_id = t.id AND ea.employer_id = $1
     LEFT JOIN placement_drives pd ON pd.tenant_id = t.id AND pd.employer_id = $1 ${AND_DRIVE_PD_NOT_DELETED}
     WHERE t.is_active = true AND t.type = 'college'
     GROUP BY t.id, t.name, t.slug, t.city, t.state, t.email, t.phone, t.logo_url,
              t.naac_grade, t.nirf_rank, t.accreditation, t.website,
              t.is_central_university, t.is_state_university, t.is_deemed_university,
              t.is_private_university, t.is_institution_national_importance, t.is_institute_state_legislature,
              t.is_affiliated_college, t.is_autonomous_college, t.is_constituent_college,
              t.is_government_college, t.is_private_aided_college, t.is_private_unaided_college,
              ea.status, ea.created_at, ea.approved_at
     ORDER BY t.name`,
    [employerId],
  );
  return result.rows.map(serializeCollegeRow);
}

async function fetchCollegesSimple(employerId) {
  const result = await query(
    `SELECT
        t.id,
        t.name,
        t.slug,
        t.city,
        t.state,
        t.email,
        t.phone,
        t.logo_url,
        t.naac_grade,
        t.nirf_rank,
        t.accreditation,
        t.website,
        ${INSTITUTION_CLASSIFICATION_SELECT_SQL},
        ea.status AS approval_status,
        ea.created_at AS requested_at,
        ea.approved_at
     FROM tenants t
     LEFT JOIN employer_approvals ea ON ea.tenant_id = t.id AND ea.employer_id = $1
     WHERE t.is_active = true AND t.type = 'college'
     ORDER BY t.name`,
    [employerId],
  );
  return result.rows.map((row) =>
    serializeCollegeRow({
      ...row,
      total_students: 0,
      placed_students: 0,
      avg_cgpa: null,
      active_drives: 0,
    }),
  );
}

// GET /api/employer/campuses
async function __platform_GET() {
  let session = null;
  let employer = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized — sign in as an employer' }, { status: 401 });
    }

    employer = await resolveEmployer(session);
    if (!employer) {
      return NextResponse.json(
        {
          error: 'Employer profile not found for this account. Complete employer registration or contact support.',
        },
        { status: 404 },
      );
    }

    let colleges;
    try {
      colleges = await fetchCollegesDetailed(employer.id);
    } catch (detailErr) {
      console.warn('Campuses detailed query failed, using simple list:', detailErr.message);
      colleges = await fetchCollegesSimple(employer.id);
    }

    const postingCampusConstraints = await loadEmployerPostingCampusConstraints(query, employer.id);

    return NextResponse.json({
      employerId: employer.id,
      companyName: employer.company_name,
      colleges,
      postingCampusConstraints,
    });
  } catch (error) {
    return respondPlatformError(error, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_CAMPUS_LIST,
      sessionUser: session?.user,
      employerId: employer?.id || null,
      defaultMessage: 'Failed to fetch campuses',
      logLabel: 'GET /api/employer/campuses',
    });
  }
}

// POST /api/employer/campuses
async function __platform_POST(req) {
  let session = null;
  let employer = null;
  let body = {};
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    body = await req.json().catch(() => ({}));
    const { collegeId } = body;
    if (!collegeId) {
      return NextResponse.json({ error: 'collegeId is required' }, { status: 400 });
    }

    employer = await resolveEmployer(session);
    if (!employer) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }
    const employerId = employer.id;

    const empName = await query(`SELECT company_name FROM employer_profiles WHERE id = $1::uuid`, [employerId]);
    const companyName = empName.rows[0]?.company_name || 'An employer';

    const ins = await query(
      `INSERT INTO employer_approvals (tenant_id, employer_id, status)
       VALUES ($1::uuid, $2::uuid, 'pending')
       ON CONFLICT (tenant_id, employer_id) DO UPDATE SET
         status = 'pending',
         rejection_reason = NULL,
         approved_by = NULL,
         approved_at = NULL
       WHERE employer_approvals.status IN ('rejected', 'blacklisted', 'revoked')
       RETURNING id`,
      [collegeId, employerId],
    );

    if (ins.rows.length > 0) {
      const college = await query(`SELECT name FROM tenants WHERE id = $1::uuid`, [collegeId]);
      const collegeName = college.rows[0]?.name || 'your institution';
      const adminIds = await fetchCollegeAdminUserIds(collegeId);
      await notifyUsersOneAtATime(adminIds, {
        title: `${companyName} requested campus access`,
        message: `${companyName} has requested to partner with ${collegeName}. Review pending employer requests.`,
        type: 'info',
        link: '/dashboard/college/employers/requests',
      });
      return NextResponse.json({
        success: true,
        message: 'Tie-up request submitted',
        notified: true,
      });
    }

    const existing = await query(
      `SELECT status FROM employer_approvals WHERE tenant_id = $1::uuid AND employer_id = $2::uuid`,
      [collegeId, employerId],
    );
    const st = existing.rows[0]?.status;
    if (st === 'pending') {
      return NextResponse.json({
        success: true,
        message: 'A tie-up request is already pending for this campus',
        notified: false,
        alreadyPending: true,
      });
    }
    if (st === 'approved') {
      return NextResponse.json(
        { error: 'You already have an approved tie-up with this campus. Open it from the table.' },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: 'Could not create tie-up request' }, { status: 400 });
  } catch (error) {
    return respondPlatformError(error, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_CAMPUS_REQUEST,
      request: req,
      sessionUser: session?.user,
      employerId: employer?.id || null,
      requestBody: body,
      defaultMessage: 'Failed to request campus access',
      logLabel: 'POST /api/employer/campuses',
    });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_employer_campuses' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
