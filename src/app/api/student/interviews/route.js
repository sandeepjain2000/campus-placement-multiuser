import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { toDateOnlyString } from '@/lib/dateOnly';
import { AND_APP_NOT_DELETED, AND_DRIVE_PD_NOT_DELETED } from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const studentRes = await query(
      `SELECT id
       FROM student_profiles
       WHERE user_id = $1 AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
       LIMIT 1`,
      [userId]
    );
    const studentId = studentRes.rows[0]?.id;
    if (!studentId) return NextResponse.json({ interviews: [] });

    const interviewsRes = await query(
      `SELECT
         a.id,
         ep.company_name AS company,
         ep.website AS website,
         COALESCE(dr.title, CONCAT('Round ', a.current_round::text)) AS round,
         pd.drive_date AS interview_date,
         COALESCE(dr.start_time, pd.start_time) AS interview_time,
         pd.drive_type AS mode,
         COALESCE(dr.venue, pd.venue, 'TBD') AS location,
         a.status
       FROM applications a
       JOIN placement_drives pd ON pd.id = a.drive_id
       LEFT JOIN employer_profiles ep ON ep.id = pd.employer_id
       LEFT JOIN drive_rounds dr
         ON dr.drive_id = pd.id
        AND dr.round_number = CASE WHEN a.current_round > 0 THEN a.current_round ELSE 1 END
       WHERE a.student_id = $1 ${AND_APP_NOT_DELETED} ${AND_DRIVE_PD_NOT_DELETED}
         AND a.status IN ('shortlisted', 'in_progress', 'selected')
       ORDER BY pd.drive_date ASC NULLS LAST, COALESCE(dr.start_time, pd.start_time) ASC NULLS LAST`,
      [studentId]
    );

    const interviews = interviewsRes.rows.map((row) => ({
      id: row.id,
      company: row.company || 'Company',
      website: row.website || null,
      round: row.round || 'Interview Round',
      date: row.interview_date ? toDateOnlyString(row.interview_date) : null,
      time: row.interview_time ? String(row.interview_time).slice(0, 5) : '',
      mode: row.mode === 'virtual' ? 'Virtual' : row.mode === 'on_campus' ? 'On-Campus' : 'Hybrid',
      location: row.location || 'TBD',
      status: row.status === 'selected' ? 'Completed' : 'Scheduled',
    }));

    return NextResponse.json({ interviews });
  } catch (error) {
    console.error('GET /api/student/interviews', error);
    return NextResponse.json({ error: 'Failed to load interviews' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_student_interviews' });
export const GET = __platformApiHandlers.GET;
