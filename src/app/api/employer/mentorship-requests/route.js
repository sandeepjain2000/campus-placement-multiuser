import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { getEmployerProfileId } from '@/lib/employerApplicationAccess';
import {
  mapMentorshipRequestRow,
  MENTORSHIP_REQUEST_LIST_SQL,
} from '@/lib/studentMentorshipRequest';
import { sqlEmployerTieUpIsActive } from '@/lib/employerTieUpShared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerProfileId(session.user.id);
    if (!employerId) {
      return NextResponse.json({ items: [] });
    }

    const r = await query(
      `SELECT ${MENTORSHIP_REQUEST_LIST_SQL},
              t.name AS college_name,
              EXISTS (
                SELECT 1 FROM student_mentorship_volunteers smv
                WHERE smv.request_id = smr.id AND smv.employer_id = $1::uuid
              ) AS has_volunteered,
              (SELECT COUNT(*)::int FROM student_mentorship_volunteers v WHERE v.request_id = smr.id) AS volunteer_count
       FROM student_mentorship_requests smr
       INNER JOIN student_profiles sp ON sp.id = smr.student_profile_id
       INNER JOIN users u ON u.id = sp.user_id
       INNER JOIN tenants t ON t.id = smr.tenant_id
       INNER JOIN employer_approvals ea ON ea.tenant_id = smr.tenant_id AND ea.employer_id = $1::uuid
       WHERE smr.status = 'approved'
         AND ${sqlEmployerTieUpIsActive('ea')}
       ORDER BY smr.updated_at DESC`,
      [employerId],
    );

    const items = r.rows.map((row) =>
      mapMentorshipRequestRow(row, {
        volunteers: [],
      }),
    );

    return NextResponse.json({ items });
  } catch (e) {
    if (e?.code === '42P01') {
      return NextResponse.json(
        { error: 'Mentorship requests are not available until migration 098_student_mentorship_requests.sql is applied.' },
        { status: 503 },
      );
    }
    console.error('GET /api/employer/mentorship-requests', e);
    return NextResponse.json({ error: 'Failed to load mentorship requests' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: 'api_employer_mentorship_requests' },
);
export const GET = __platformApiHandlers.GET;
