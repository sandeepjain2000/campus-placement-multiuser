import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { AND_DRIVE_PD_NOT_DELETED, AND_JP_NOT_DELETED, AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';
import { resolveCollegeStaffTenantFromSession } from '@/lib/sessionTenant';
import { assertCollegeStaff } from '@/lib/collegeAccess';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const gate = assertCollegeStaff(session);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const tenantId = await resolveCollegeStaffTenantFromSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    // Fetch placement stats
    const statsQuery = await query(`
      SELECT 
        COUNT(*) as "totalStudents",
        SUM(CASE WHEN placement_status = 'placed' THEN 1 ELSE 0 END) as "placedStudents",
        (SELECT COUNT(DISTINCT employer_id) FROM placement_drives pd WHERE pd.tenant_id = $1 AND pd.status IN ('approved', 'scheduled', 'completed') ${AND_DRIVE_PD_NOT_DELETED}) as "activeEmployers",
        (SELECT COUNT(*) FROM placement_drives pd WHERE pd.tenant_id = $1 AND pd.status IN ('approved', 'scheduled') ${AND_DRIVE_PD_NOT_DELETED}) as "activeDrives",
        (SELECT AVG(salary) FROM offers o WHERE o.student_id IN (SELECT id FROM student_profiles WHERE tenant_id = $1 AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}) AND o.status = 'accepted' ${AND_OFFER_NOT_DELETED}) as "avgPackage",
        (SELECT MAX(salary) FROM offers o WHERE o.student_id IN (SELECT id FROM student_profiles WHERE tenant_id = $1 AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}) AND o.status = 'accepted' ${AND_OFFER_NOT_DELETED}) as "highestPackage",
        (
          SELECT MIN(COALESCE(NULLIF(jp.salary_min, 0), jp.salary_max))
          FROM job_postings jp
          INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id
          WHERE jpv.tenant_id = $1
            AND jp.status = 'published'
            AND jp.job_type IN ('full_time', 'part_time')
            ${AND_JP_NOT_DELETED}
        ) as "minJobAmount",
        (
          SELECT MIN(COALESCE(NULLIF(jp.salary_min, 0), jp.salary_max))
          FROM job_postings jp
          INNER JOIN job_posting_visibility jpv ON jpv.job_id = jp.id
          WHERE jpv.tenant_id = $1
            AND jp.status = 'published'
            AND jp.job_type = 'internship'
            ${AND_JP_NOT_DELETED}
        ) as "minInternshipAmount"
      FROM student_profiles sp
      WHERE sp.tenant_id = $1 AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
    `, [tenantId]);

    // Fetch department stats
    const deptQuery = await query(`
      SELECT 
        department as dept,
        COUNT(*) as total,
        SUM(CASE WHEN placement_status = 'placed' THEN 1 ELSE 0 END) as placed,
        ROUND(SUM(CASE WHEN placement_status = 'placed' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)) as pct
      FROM student_profiles sp
      WHERE sp.tenant_id = $1 AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
      GROUP BY department
      ORDER BY pct DESC
    `, [tenantId]);
    
    // Determine pending actions
    const pendingQuery = await query(`
      SELECT
        (SELECT COUNT(*) FROM placement_drives pd WHERE pd.tenant_id = $1 AND pd.status = 'requested' ${AND_DRIVE_PD_NOT_DELETED}) as "drivesCount",
        (SELECT COUNT(*) FROM users u JOIN student_profiles sp ON u.id = sp.user_id WHERE sp.tenant_id = $1 AND ${STUDENT_PROFILE_ACTIVE_CLAUSE} AND u.is_verified = false) as "studentsCount"
    `, [tenantId]);

    const s = statsQuery.rows[0];
    const total = parseInt(s.totalStudents || 0);
    const placed = parseInt(s.placedStudents || 0);

    return NextResponse.json({
      stats: {
        totalStudents: total,
        placedStudents: placed,
        placementRate: total > 0 ? Math.round((placed / total) * 100) : 0,
        activeEmployers: parseInt(s.activeEmployers || 0),
        activeDrives: parseInt(s.activeDrives || 0),
        avgPackage: s.avgPackage != null ? Number(s.avgPackage) : 0,
        highestPackage: s.highestPackage != null ? Number(s.highestPackage) : 0,
        minJobAmount: s.minJobAmount != null ? Number(s.minJobAmount) : 0,
        minInternshipAmount: s.minInternshipAmount != null ? Number(s.minInternshipAmount) : 0,
      },
      departmentStats: deptQuery.rows.map(d => ({
        dept: d.dept,
        total: parseInt(d.total),
        placed: parseInt(d.placed),
        pct: parseInt(d.pct || 0)
      })),
      recentActivity: [],
      pendingActions: {
        drivesCount: parseInt(pendingQuery.rows[0].drivesCount || 0),
        studentsCount: parseInt(pendingQuery.rows[0].studentsCount || 0),
        documentsCount: 0
      }
    });
  } catch (error) {
    console.error('Failed to load college dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to load college dashboard data' },
      { status: 500 }
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_dashboard' });
export const GET = __platformApiHandlers.GET;
