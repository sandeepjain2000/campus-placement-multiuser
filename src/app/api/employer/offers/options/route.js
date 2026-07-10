import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { AND_APP_NOT_DELETED, AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function getEmployerId(session) {
  const userId = session?.user?.id;
  if (!userId) return null;
  const employerResult = await query(
    `SELECT id FROM employer_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return employerResult.rows[0]?.id || null;
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const employerId = await getEmployerId(session);
    if (!employerId) {
      return NextResponse.json({ drives: [], internships: [], students: [] });
    }

    const [drivesRes, internshipsRes, studentsRes] = await Promise.all([
      query(
        `SELECT id, title, drive_date
         FROM placement_drives d
         WHERE d.employer_id = $1 ${AND_DRIVE_NOT_DELETED}
         ORDER BY drive_date DESC, created_at DESC
         LIMIT 300`,
        [employerId]
      ),
      query(
        `SELECT jp.id, jp.title, jp.internship_start_date, jp.internship_end_date
         FROM job_postings jp
         WHERE jp.employer_id = $1::uuid AND jp.job_type = 'internship' ${AND_JP_NOT_DELETED}
         ORDER BY jp.internship_start_date DESC NULLS LAST, jp.created_at DESC
         LIMIT 300`,
        [employerId]
      ),
      query(
        `SELECT DISTINCT sp.id, u.first_name, u.last_name, u.email, t.name AS college_name
         FROM applications a
         JOIN placement_drives d ON d.id = a.drive_id
         JOIN student_profiles sp ON sp.id = a.student_id
         JOIN users u ON u.id = sp.user_id
         LEFT JOIN tenants t ON t.id = sp.tenant_id
         WHERE d.employer_id = $1 ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED} AND ${SP_ACTIVE_CLAUSE}
         ORDER BY u.first_name ASC, u.last_name ASC
         LIMIT 500`,
        [employerId]
      ),
    ]);

    return NextResponse.json({
      drives: drivesRes.rows,
      internships: internshipsRes.rows,
      students: studentsRes.rows.map((s) => ({
        id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || 'Unknown Student',
        email: s.email,
        collegeName: s.college_name || '',
      })),
    });
  } catch (error) {
    console.error('Failed to load offer options:', error);
    return NextResponse.json({ error: 'Failed to load options' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_offers_options' });
export const GET = __platformApiHandlers.GET;
