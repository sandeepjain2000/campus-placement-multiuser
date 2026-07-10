import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import {
  mapMentorshipRequestRow,
  mapMentorshipVolunteerRow,
  MENTORSHIP_REQUEST_LIST_SQL,
  validateMentorshipRequestPayload,
} from '@/lib/studentMentorshipRequest';
import { notifyCollegeAdminsOfTenant } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadVolunteersForRequest(requestId) {
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

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentId) {
      return NextResponse.json({ items: [] });
    }

    const r = await query(
      `SELECT ${MENTORSHIP_REQUEST_LIST_SQL},
              (SELECT COUNT(*)::int FROM student_mentorship_volunteers v WHERE v.request_id = smr.id) AS volunteer_count
       FROM student_mentorship_requests smr
       INNER JOIN student_profiles sp ON sp.id = smr.student_profile_id
       INNER JOIN users u ON u.id = sp.user_id
       WHERE smr.student_profile_id = $1::uuid
       ORDER BY smr.updated_at DESC`,
      [studentId],
    );

    const items = await Promise.all(
      r.rows.map(async (row) => {
        const volunteers = row.status === 'approved' ? await loadVolunteersForRequest(row.id) : [];
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
    console.error('GET /api/student/mentorship-requests', e);
    return NextResponse.json({ error: 'Failed to load mentorship requests' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const studentId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentId) {
      return NextResponse.json({ error: 'Student profile required' }, { status: 400 });
    }

    const body = await request.json();
    const validated = validateMentorshipRequestPayload(body);
    if (validated.error) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const submitNow = Boolean(body.submit);
    const status = submitNow ? 'submitted' : 'draft';
    const { title, summary, topics, preferredFormat, timeHint } = validated.data;

    const ins = await query(
      `INSERT INTO student_mentorship_requests
        (tenant_id, student_profile_id, title, summary, topics, preferred_format, time_hint, status)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [tenantId, studentId, title, summary, topics, preferredFormat, timeHint, status],
    );

    const id = ins.rows[0].id;

    if (submitNow) {
      await notifyCollegeAdminsOfTenant(tenantId, {
        title: 'New mentorship request',
        message: `A student submitted a mentorship request: ${title}`,
        type: 'info',
        link: '/dashboard/college/mentorship-requests',
      });
    }

    const detail = await query(
      `SELECT ${MENTORSHIP_REQUEST_LIST_SQL}
       FROM student_mentorship_requests smr
       INNER JOIN student_profiles sp ON sp.id = smr.student_profile_id
       INNER JOIN users u ON u.id = sp.user_id
       WHERE smr.id = $1::uuid`,
      [id],
    );

    return NextResponse.json(
      { item: mapMentorshipRequestRow(detail.rows[0], { volunteers: [] }) },
      { status: 201 },
    );
  } catch (e) {
    if (e?.code === '42P01') {
      return NextResponse.json(
        { error: 'Mentorship requests are not available until migration 098_student_mentorship_requests.sql is applied.' },
        { status: 503 },
      );
    }
    console.error('POST /api/student/mentorship-requests', e);
    return NextResponse.json({ error: 'Failed to create mentorship request' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET, POST: __platform_POST },
  { context: 'api_student_mentorship_requests' },
);
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
