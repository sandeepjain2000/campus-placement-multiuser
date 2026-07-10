import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;

    // Fetch placement stats
    const statsQuery = await query(`
      SELECT 
        COUNT(*) as "totalStudents",
        SUM(CASE WHEN placement_status = 'placed' THEN 1 ELSE 0 END) as "placedStudents",
        (SELECT COUNT(DISTINCT employer_id) FROM placement_drives WHERE tenant_id = $1 AND status IN ('approved', 'scheduled', 'completed')) as "activeEmployers",
        (SELECT COUNT(*) FROM placement_drives WHERE tenant_id = $1 AND status IN ('approved', 'scheduled')) as "activeDrives",
        (SELECT AVG(salary) FROM offers WHERE student_id IN (SELECT id FROM student_profiles WHERE tenant_id = $1) AND status = 'accepted') as "avgPackage",
        (SELECT MAX(salary) FROM offers WHERE student_id IN (SELECT id FROM student_profiles WHERE tenant_id = $1) AND status = 'accepted') as "highestPackage"
      FROM student_profiles
      WHERE tenant_id = $1
    `, [tenantId]);

    // Fetch department stats
    const deptQuery = await query(`
      SELECT 
        department as dept,
        COUNT(*) as total,
        SUM(CASE WHEN placement_status = 'placed' THEN 1 ELSE 0 END) as placed,
        ROUND(SUM(CASE WHEN placement_status = 'placed' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)) as pct
      FROM student_profiles
      WHERE tenant_id = $1
      GROUP BY department
      ORDER BY pct DESC
    `, [tenantId]);
    
    // Determine pending actions
    const pendingQuery = await query(`
      SELECT
        (SELECT COUNT(*) FROM placement_drives WHERE tenant_id = $1 AND status = 'requested') as "drivesCount",
        (SELECT COUNT(*) FROM users u JOIN student_profiles sp ON u.id = sp.user_id WHERE sp.tenant_id = $1 AND u.is_verified = false) as "studentsCount"
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
