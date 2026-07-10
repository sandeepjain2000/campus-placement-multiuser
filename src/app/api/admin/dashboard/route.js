import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statsQuery = await query(`
      SELECT 
        (SELECT COUNT(*) FROM tenants WHERE type = 'college') as "colleges",
        (SELECT COUNT(*) FROM employer_profiles) as "employers",
        (SELECT COUNT(*) FROM student_profiles WHERE ${STUDENT_PROFILE_ACTIVE_CLAUSE}) as "students",
        (SELECT COUNT(*) FROM users) as "totalUsers"
    `);

    const [collegesQuery, employersQuery] = await Promise.all([
      query(`
        SELECT id, name
        FROM tenants
        WHERE type = 'college'
        ORDER BY created_at DESC
        LIMIT 5
      `),
      query(`
        SELECT id, company_name AS name
        FROM employer_profiles
        ORDER BY created_at DESC
        LIMIT 5
      `),
    ]);

    const stats = statsQuery?.rows?.[0] || {};
    return NextResponse.json({
      stats: {
        colleges: parseInt(stats.colleges || 0, 10),
        employers: parseInt(stats.employers || 0, 10),
        students: parseInt(stats.students || 0, 10),
        totalUsers: parseInt(stats.totalUsers || 0, 10),
      },
      registeredColleges: collegesQuery?.rows || [],
      registeredEmployers: employersQuery?.rows || [],
    });
  } catch (error) {
    console.error('Failed to load admin dashboard data:', error.message);
    return NextResponse.json(
      { error: 'Failed to load admin dashboard data' },
      { status: 500 }
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_admin_dashboard' });
export const GET = __platformApiHandlers.GET;
