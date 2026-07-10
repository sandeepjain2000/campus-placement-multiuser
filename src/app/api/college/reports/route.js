import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || session.user.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const [summaryRes, deptRes, salaryRes, recruitersRes] = await Promise.all([
      query(
        `SELECT
           COUNT(*)::int AS total_students,
           COUNT(*) FILTER (WHERE placement_status = 'placed')::int AS placed_students
         FROM student_profiles
         WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}`,
        [tenantId],
      ),
      query(
        `SELECT department,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE placement_status = 'placed')::int AS placed
         FROM student_profiles
         WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
         GROUP BY department
         ORDER BY department`,
        [tenantId],
      ),
      query(
        `SELECT
           CASE
             WHEN salary < 500000 THEN '< ₹5 LPA'
             WHEN salary < 1000000 THEN '₹5-10 LPA'
             WHEN salary < 1500000 THEN '₹10-15 LPA'
             WHEN salary < 2500000 THEN '₹15-25 LPA'
             ELSE '₹25+ LPA'
           END AS range,
           COUNT(*)::int AS count
         FROM offers o
         WHERE o.student_id IN (SELECT id FROM student_profiles WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE})
           AND o.status = 'accepted' ${AND_OFFER_NOT_DELETED}
         GROUP BY 1`,
        [tenantId],
      ),
      query(
        `SELECT ep.company_name AS name,
                COUNT(*)::int AS hires,
                ROUND(AVG(o.salary))::int AS avg_ctc
         FROM offers o
         LEFT JOIN employer_profiles ep ON ep.id = o.employer_id
         WHERE o.student_id IN (SELECT id FROM student_profiles WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE})
           AND o.status = 'accepted' ${AND_OFFER_NOT_DELETED}
         GROUP BY ep.company_name
         ORDER BY hires DESC
         LIMIT 10`,
        [tenantId],
      ),
    ]);

    const totalStudents = Number(summaryRes.rows[0]?.total_students || 0);
    const placedStudents = Number(summaryRes.rows[0]?.placed_students || 0);
    const placementRate = totalStudents > 0 ? Math.round((placedStudents / totalStudents) * 100) : 0;

    const acceptedOffersAvgRes = await query(
      `SELECT ROUND(AVG(salary))::int AS avg_ctc, MAX(salary)::int AS highest
       FROM offers o
       WHERE o.student_id IN (SELECT id FROM student_profiles WHERE tenant_id = $1::uuid AND ${STUDENT_PROFILE_ACTIVE_CLAUSE})
         AND o.status = 'accepted' ${AND_OFFER_NOT_DELETED}`,
      [tenantId],
    );
    const avgPackage = Number(acceptedOffersAvgRes.rows[0]?.avg_ctc || 0);
    const highestPackage = Number(acceptedOffersAvgRes.rows[0]?.highest || 0);

    const deptPlacement = deptRes.rows.map((r) => {
      const total = Number(r.total || 0);
      const placed = Number(r.placed || 0);
      const pct = total > 0 ? Math.round((placed / total) * 100) : 0;
      return { dept: r.department || '—', total, placed, pct };
    });

    const salaryBuckets = ['< ₹5 LPA', '₹5-10 LPA', '₹10-15 LPA', '₹15-25 LPA', '₹25+ LPA'];
    const byRange = Object.fromEntries(salaryRes.rows.map((r) => [r.range, Number(r.count || 0)]));
    const totalAccepted = Object.values(byRange).reduce((s, c) => s + c, 0);
    const salaryDist = salaryBuckets.map((range) => {
      const count = byRange[range] || 0;
      return { range, count, pct: totalAccepted > 0 ? Math.round((count / totalAccepted) * 100) : 0 };
    });

    const topRecruiters = recruitersRes.rows.map((r) => ({
      name: r.name || 'Unknown',
      hires: Number(r.hires || 0),
      ctc: r.avg_ctc ? `₹${(Number(r.avg_ctc) / 100000).toFixed(1)}L` : '—',
    }));

    return NextResponse.json({
      totalStudents,
      totalPlaced: placedStudents,
      avgCTC: avgPackage,
      highestCTC: highestPackage,
      placementPercentage: placementRate,
      summary: {
        placementRate,
        avgPackage,
        highestPackage,
        companiesVisited: topRecruiters.length,
      },
      deptPlacement,
      salaryDist,
      topRecruiters,
      yoy: [],
      studentCompanyEvents: [],
    });
  } catch (error) {
    console.error('GET /api/college/reports', error);
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_reports' });
export const GET = __platformApiHandlers.GET;
