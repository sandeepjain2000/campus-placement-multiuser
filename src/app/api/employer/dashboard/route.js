import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import {
  resolveEmployerCampusAcademicYear,
  sqlDriveAcademicYearFilter,
  sqlJobAcademicYearFilter,
} from '@/lib/employerAcademicYear';
import { hasColumn, jobPostingNotDeletedSql } from '@/lib/migrationReady';
import { respondPlatformError , withApiHandlers } from '@/lib/platformErrorRoute';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function softDeleteFilter(table, alias) {
  if (await hasColumn(table, 'is_deleted')) {
    return `AND COALESCE(${alias}.is_deleted, false) = false`;
  }
  return '';
}

async function resolveDashboardAcademicYear(employerId, campusId, searchParams) {
  try {
    const ay = await resolveEmployerCampusAcademicYear(employerId, campusId, searchParams);
    return ay.year?.id || null;
  } catch (ayErr) {
    if (ayErr?.statusCode === 403 || ayErr?.statusCode === 400) {
      throw ayErr;
    }
    console.warn('Employer dashboard: academic year scope unavailable', ayErr?.message || ayErr);
    return null;
  }
}

async function buildDashboardFilters(academicYearId) {
  const [appDel, pdDel, dDel, jpDel, oDel, hasDriveYear, hasJobYear, hasJpv] = await Promise.all([
    softDeleteFilter('applications', 'a'),
    softDeleteFilter('placement_drives', 'pd'),
    softDeleteFilter('placement_drives', 'd'),
    jobPostingNotDeletedSql('jp'),
    softDeleteFilter('offers', 'o'),
    hasColumn('placement_drives', 'academic_year_id'),
    hasColumn('job_postings', 'academic_year_id'),
    hasColumn('job_posting_visibility', 'job_id'),
  ]);

  let driveYearFilterPd = '';
  let driveYearFilterD = '';
  let jobYearFilter = '';
  let yearParam = null;

  if (academicYearId && (hasDriveYear || hasJobYear)) {
    yearParam = academicYearId;
    const idx = 3;
    if (hasDriveYear) {
      driveYearFilterPd = sqlDriveAcademicYearFilter('pd', idx);
      driveYearFilterD = sqlDriveAcademicYearFilter('d', idx);
    }
    if (hasJobYear) {
      jobYearFilter = sqlJobAcademicYearFilter('jp', idx);
    }
  }

  return {
    appDel,
    pdDel,
    dDel,
    jpDel,
    oDel,
    driveYearFilterPd,
    driveYearFilterD,
    jobYearFilter,
    hasJpv,
    yearParam,
  };
}

function statsParams(employerId, campusId, yearParam) {
  return yearParam ? [employerId, campusId, yearParam] : [employerId, campusId];
}

async function queryDashboardStats(employerId, campusId, filters) {
  const {
    appDel,
    pdDel,
    dDel,
    jpDel,
    oDel,
    driveYearFilterPd,
    driveYearFilterD,
    jobYearFilter,
    hasJpv,
    yearParam,
  } = filters;

  const params = statsParams(employerId, campusId, yearParam);

  const activeJobsSql = hasJpv
    ? `(SELECT COUNT(*)::int FROM job_postings jp
         INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id AND jpv.tenant_id = $2::uuid
         WHERE jp.employer_id = $1::uuid AND jp.status = 'published'
           ${jpDel}${jobYearFilter})`
    : `(SELECT COUNT(*)::int FROM placement_drives d
         WHERE d.employer_id = $1::uuid AND d.tenant_id = $2::uuid
           AND d.status IN ('scheduled', 'approved') ${dDel}${driveYearFilterD})`;

  const sql = `
      SELECT
        ${activeJobsSql} as active_jobs,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2 ${appDel} ${pdDel}${driveYearFilterPd}) as total_applications,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2 AND a.status IN ('shortlisted', 'selected')
           ${appDel} ${pdDel}${driveYearFilterPd}) as shortlisted,
        (SELECT COUNT(*) FROM offers o JOIN placement_drives pd ON o.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2 ${oDel} ${pdDel}${driveYearFilterPd}) as offers_extended,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2 AND a.status = 'in_progress'
           ${appDel} ${pdDel}${driveYearFilterPd}) as interview_stage,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2 AND a.status = 'selected'
           ${appDel} ${pdDel}${driveYearFilterPd}) as selected_count
    `;

  try {
    return await query(sql, params);
  } catch (err) {
    if (err?.code !== '42703' && err?.code !== '42P01') throw err;
    return query(`
      SELECT
        (SELECT COUNT(*)::int FROM placement_drives
         WHERE employer_id = $1::uuid AND tenant_id = $2::uuid AND status IN ('scheduled', 'approved')) as active_jobs,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2) as total_applications,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2 AND a.status IN ('shortlisted', 'selected')) as shortlisted,
        (SELECT COUNT(*) FROM offers o JOIN placement_drives pd ON o.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2) as offers_extended,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2 AND a.status = 'in_progress') as interview_stage,
        (SELECT COUNT(*) FROM applications a JOIN placement_drives pd ON a.drive_id = pd.id
         WHERE pd.employer_id = $1 AND pd.tenant_id = $2 AND a.status = 'selected') as selected_count
    `, [employerId, campusId]);
  }
}

async function queryRecentApplications(employerId, campusId, filters) {
  const { appDel, pdDel, driveYearFilterPd, yearParam } = filters;
  const params = statsParams(employerId, campusId, yearParam);
  const sql = `
      SELECT a.id, u.first_name || ' ' || COALESCE(u.last_name, '') as name, pd.title as role,
             t.name as college, sp.cgpa, a.status, a.applied_at as "appliedAt"
      FROM applications a
      JOIN placement_drives pd ON a.drive_id = pd.id
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      JOIN tenants t ON sp.tenant_id = t.id
      WHERE pd.employer_id = $1 AND pd.tenant_id = $2
        ${appDel} ${pdDel}${driveYearFilterPd}
      ORDER BY a.applied_at DESC
      LIMIT 5
    `;
  try {
    return await query(sql, params);
  } catch (err) {
    if (err?.code !== '42703' && err?.code !== '42P01') throw err;
    return query(`
      SELECT a.id, u.first_name || ' ' || COALESCE(u.last_name, '') as name, pd.title as role,
             t.name as college, sp.cgpa, a.status, a.applied_at as "appliedAt"
      FROM applications a
      JOIN placement_drives pd ON a.drive_id = pd.id
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      JOIN tenants t ON sp.tenant_id = t.id
      WHERE pd.employer_id = $1 AND pd.tenant_id = $2
      ORDER BY a.applied_at DESC
      LIMIT 5
    `, [employerId, campusId]);
  }
}

async function queryUpcomingDrives(employerId, campusId, filters) {
  const { dDel, driveYearFilterD, yearParam } = filters;
  const params = statsParams(employerId, campusId, yearParam);
  const sql = `
      SELECT d.id, t.name as college, d.title as role, d.drive_date as date, d.drive_type as type, d.status
      FROM placement_drives d
      JOIN tenants t ON d.tenant_id = t.id
      WHERE d.employer_id = $1 AND d.tenant_id = $2 AND d.status IN ('approved', 'scheduled')
        ${dDel}${driveYearFilterD}
      ORDER BY d.drive_date ASC
      LIMIT 2
    `;
  try {
    return await query(sql, params);
  } catch (err) {
    if (err?.code !== '42703' && err?.code !== '42P01') throw err;
    return query(`
      SELECT d.id, t.name as college, d.title as role, d.drive_date as date, d.drive_type as type, d.status
      FROM placement_drives d
      JOIN tenants t ON d.tenant_id = t.id
      WHERE d.employer_id = $1 AND d.tenant_id = $2 AND d.status IN ('approved', 'scheduled')
      ORDER BY d.drive_date ASC
      LIMIT 2
    `, [employerId, campusId]);
  }
}

async function __platform_GET(request) {
  let session = null;
  let employerId = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campusId = searchParams.get('campusId');
    if (!campusId) return NextResponse.json({ error: 'Campus ID is required' }, { status: 400 });

    const userId = session.user.id || session.user.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Session user id missing' }, { status: 401 });
    }
    const empQuery = await query(`SELECT id FROM employer_profiles WHERE user_id = $1`, [userId]);
    employerId = empQuery.rows[0]?.id;
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 });
    }

    const academicYearId = await resolveDashboardAcademicYear(employerId, campusId, searchParams);

    const filters = await buildDashboardFilters(academicYearId);

    const [statsQuery, appsQuery, drivesQuery] = await Promise.all([
      queryDashboardStats(employerId, campusId, filters),
      queryRecentApplications(employerId, campusId, filters),
      queryUpcomingDrives(employerId, campusId, filters),
    ]);

    const statsRow = statsQuery.rows[0] || {};

    return NextResponse.json({
      stats: {
        activeJobs: parseInt(statsRow.active_jobs || 0, 10),
        totalApplications: parseInt(statsRow.total_applications || 0, 10),
        shortlisted: parseInt(statsRow.shortlisted || 0, 10),
        offersExtended: parseInt(statsRow.offers_extended || 0, 10),
        interviewStage: parseInt(statsRow.interview_stage || 0, 10),
        selectedCount: parseInt(statsRow.selected_count || 0, 10),
      },
      recentApplications: appsQuery.rows,
      upcomingDrives: drivesQuery.rows,
    });
  } catch (error) {
    return respondPlatformError(error, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_DASHBOARD,
      request,
      sessionUser: session?.user,
      employerId: employerId || null,
      defaultMessage: 'Failed to load employer dashboard data',
      logLabel: 'GET /api/employer/dashboard',
    });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_dashboard' });
export const GET = __platformApiHandlers.GET;
