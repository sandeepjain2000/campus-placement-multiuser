import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { getEmployerProfileId } from '@/lib/employerApplicationAccess';
import {
  mapMentorshipRequestRow,
  mapMentorshipVolunteerRow,
  MENTORSHIP_REQUEST_LIST_SQL,
} from '@/lib/studentMentorshipRequest';
import { sqlEmployerTieUpIsActive } from '@/lib/employerTieUpShared';
import { notifyUsersOneAtATime } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_MESSAGE_LEN = 2000;

async function __platform_POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employerId = await getEmployerProfileId(session.user.id);
    if (!employerId) {
      return NextResponse.json({ error: 'Employer profile required' }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const message = String(body.message || '').trim() || null;
    if (message && message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
    }

    const check = await query(
      `SELECT smr.id, smr.title, smr.student_profile_id, sp.user_id AS student_user_id,
              ep.company_name
       FROM student_mentorship_requests smr
       INNER JOIN student_profiles sp ON sp.id = smr.student_profile_id
       INNER JOIN employer_approvals ea ON ea.tenant_id = smr.tenant_id AND ea.employer_id = $1::uuid
       INNER JOIN employer_profiles ep ON ep.id = $1::uuid
       WHERE smr.id = $2::uuid
         AND smr.status = 'approved'
         AND ${sqlEmployerTieUpIsActive('ea')}`,
      [employerId, id],
    );

    if (!check.rows.length) {
      return NextResponse.json({ error: 'Request not found or not available' }, { status: 404 });
    }

    const row = check.rows[0];

    const existing = await query(
      `SELECT id FROM student_mentorship_volunteers
       WHERE request_id = $1::uuid AND employer_id = $2::uuid`,
      [id, employerId],
    );
    if (existing.rows.length) {
      return NextResponse.json({ error: 'You have already volunteered for this request' }, { status: 409 });
    }

    const ins = await query(
      `INSERT INTO student_mentorship_volunteers
        (request_id, employer_id, employer_user_id, message)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
       RETURNING id, request_id, employer_id, message, volunteered_at`,
      [id, employerId, session.user.id, message],
    );

    const volunteerRow = ins.rows[0];
    const companyName = row.company_name || 'An employer';

    if (row.student_user_id) {
      await notifyUsersOneAtATime([row.student_user_id], {
        title: 'New mentor volunteer',
        message: `${companyName} volunteered to mentor you on "${row.title}".`,
        type: 'info',
        link: '/dashboard/student/mentorship-requests',
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

    const volunteers = await query(
      `SELECT smv.id, smv.request_id, smv.employer_id, smv.message, smv.volunteered_at,
              ep.company_name
       FROM student_mentorship_volunteers smv
       INNER JOIN employer_profiles ep ON ep.id = smv.employer_id
       WHERE smv.request_id = $1::uuid
       ORDER BY smv.volunteered_at DESC`,
      [id],
    );

    return NextResponse.json(
      {
        volunteer: mapMentorshipVolunteerRow({ ...volunteerRow, company_name: companyName }),
        item: mapMentorshipRequestRow(detail.rows[0], {
          volunteers: volunteers.rows.map(mapMentorshipVolunteerRow),
        }),
      },
      { status: 201 },
    );
  } catch (e) {
    if (e?.code === '23505') {
      return NextResponse.json({ error: 'You have already volunteered for this request' }, { status: 409 });
    }
    console.error('POST /api/employer/mentorship-requests/[id]/volunteer', e);
    return NextResponse.json({ error: 'Failed to volunteer' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { POST: __platform_POST },
  { context: 'api_employer_mentorship_requests_volunteer' },
);
export const POST = __platformApiHandlers.POST;
