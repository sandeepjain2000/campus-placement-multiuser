import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  mapMentorshipRequestRow,
  mapMentorshipVolunteerRow,
  MENTORSHIP_REQUEST_LIST_SQL,
} from '@/lib/studentMentorshipRequest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadVolunteers(requestId) {
  const r = await query(
    `SELECT smv.id, smv.request_id, smv.employer_id, smv.message, smv.volunteered_at,
            ep.company_name
     FROM student_mentorship_volunteers smv
     INNER JOIN employer_profiles ep ON ep.id = smv.employer_id
     WHERE smv.request_id = $1::uuid
     ORDER BY smv.volunteered_at DESC`,
    [requestId],
  );
  return r.rows.map(mapMentorshipVolunteerRow);
}

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const vals = [tenantId];
    let statusSql = '';
    if (status) {
      vals.push(status);
      statusSql = ` AND smr.status = $${vals.length}`;
    }

    const r = await query(
      `SELECT ${MENTORSHIP_REQUEST_LIST_SQL},
              (SELECT COUNT(*)::int FROM student_mentorship_volunteers v WHERE v.request_id = smr.id) AS volunteer_count
       FROM student_mentorship_requests smr
       INNER JOIN student_profiles sp ON sp.id = smr.student_profile_id
       INNER JOIN users u ON u.id = sp.user_id
       WHERE smr.tenant_id = $1::uuid${statusSql}
       ORDER BY smr.updated_at DESC`,
      vals,
    );

    const items = await Promise.all(
      r.rows.map(async (row) => {
        const volunteers = row.status === 'approved' ? await loadVolunteers(row.id) : [];
        return mapMentorshipRequestRow(row, { volunteers });
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
    console.error('GET /api/college/mentorship-requests', e);
    return NextResponse.json({ error: 'Failed to load mentorship requests' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: 'api_college_mentorship_requests' },
);
export const GET = __platformApiHandlers.GET;
