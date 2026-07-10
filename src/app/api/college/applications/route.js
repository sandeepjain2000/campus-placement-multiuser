import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { isArchiveSchemaError, ARCHIVE_COLUMN_HINT } from '@/lib/collegeStudentArchive';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeStaff } from '@/lib/collegeAccess';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




function getTenantId(session) {
  return session?.user?.tenantId || session?.user?.tenant_id || null;
}

const APPLICATIONS_SQL = `
  SELECT * FROM (
    SELECT
      a.id,
      'drive'::text AS source_kind,
      a.status,
      a.current_round,
      a.applied_at,
      d.title AS drive_title,
      d.title AS opening_title,
      ep.company_name,
      ep.website AS company_website,
      sp.department,
      sp.roll_number,
      COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student_name,
      'placement_drive'::text AS job_type
    FROM applications a
    INNER JOIN student_profiles sp ON sp.id = a.student_id AND sp.tenant_id = $1::uuid
    INNER JOIN placement_drives d ON d.id = a.drive_id
    LEFT JOIN users u ON u.id = sp.user_id
    LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
    WHERE __ACTIVE_STUDENT__
      AND COALESCE(a.is_deleted, false) = false
      AND COALESCE(d.is_deleted, false) = false

    UNION ALL

    SELECT
      pa.id,
      'program'::text AS source_kind,
      pa.status,
      NULL::int AS current_round,
      pa.applied_at,
      NULL::text AS drive_title,
      jp.title AS opening_title,
      ep.company_name,
      ep.website AS company_website,
      sp.department,
      sp.roll_number,
      COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student_name,
      jp.job_type::text AS job_type
    FROM program_applications pa
    INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $1::uuid
    INNER JOIN job_postings jp ON jp.id = pa.job_id
    LEFT JOIN users u ON u.id = sp.user_id
    LEFT JOIN employer_profiles ep ON ep.id = jp.employer_id
    WHERE __ACTIVE_STUDENT__
      AND COALESCE(pa.is_deleted, false) = false
      AND COALESCE(jp.is_deleted, false) = false
  ) combined
  ORDER BY applied_at DESC NULLS LAST
  LIMIT 1000`;

const COUNTS_SQL = `
  SELECT
    (SELECT COUNT(*)::int FROM applications a
     INNER JOIN student_profiles sp ON sp.id = a.student_id AND sp.tenant_id = $1::uuid
     INNER JOIN placement_drives d ON d.id = a.drive_id
     WHERE __ACTIVE_STUDENT__
       AND COALESCE(a.is_deleted, false) = false
       AND COALESCE(d.is_deleted, false) = false) AS drives,
    (SELECT COUNT(*)::int FROM program_applications pa
     INNER JOIN student_profiles sp ON sp.id = pa.student_id AND sp.tenant_id = $1::uuid
     INNER JOIN job_postings jp ON jp.id = pa.job_id
     WHERE __ACTIVE_STUDENT__
       AND COALESCE(pa.is_deleted, false) = false
       AND COALESCE(jp.is_deleted, false) = false) AS programs`;

function sqlWithActiveClause(baseSql, includeArchivedFilter) {
  const active = includeArchivedFilter ? SP_ACTIVE_CLAUSE : 'TRUE';
  return baseSql.replaceAll('__ACTIVE_STUDENT__', active);
}

async function loadApplications(tenantId, includeArchivedFilter) {
  const appsSql = sqlWithActiveClause(APPLICATIONS_SQL, includeArchivedFilter);
  const countsSql = sqlWithActiveClause(COUNTS_SQL, includeArchivedFilter);
  const [appsRes, countsRes] = await Promise.all([
    query(appsSql, [tenantId]),
    query(countsSql, [tenantId]),
  ]);
  const counts = countsRes.rows[0] || { drives: 0, programs: 0 };
  return {
    applications: appsRes.rows,
    counts: {
      drives: Number(counts.drives) || 0,
      programs: Number(counts.programs) || 0,
      total: appsRes.rows.length,
    },
  };
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    const gate = assertCollegeStaff(session);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const tenantId = (await resolveCollegeStaffTenantFromSession(session)) || getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    try {
      const payload = await loadApplications(tenantId, true);
      return NextResponse.json(payload);
    } catch (error) {
      if (isArchiveSchemaError(error)) {
        const payload = await loadApplications(tenantId, false);
        return NextResponse.json({
          ...payload,
          schemaWarning: ARCHIVE_COLUMN_HINT,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('GET /api/college/applications', error);
    const msg = String(error?.message || '');
    if (error?.code === '42P01' && msg.includes('program_applications')) {
      return NextResponse.json(
        { error: 'Program applications table missing. Run database migrations.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_applications' });
export const GET = __platformApiHandlers.GET;
