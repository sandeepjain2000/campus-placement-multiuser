import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { getOrCreateStudentProfileId } from '@/lib/studentServer';
import {
  canStudentEditRequest,
  canStudentSubmitRequest,
  mapMentorshipRequestRow,
  mapMentorshipVolunteerRow,
  MENTORSHIP_REQUEST_LIST_SQL,
  validateMentorshipRequestPayload,
} from '@/lib/studentMentorshipRequest';
import { notifyCollegeAdminsOfTenant } from '@/lib/notificationService';

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

async function loadRequestForStudent(id, studentId) {
  const r = await query(
    `SELECT ${MENTORSHIP_REQUEST_LIST_SQL}
     FROM student_mentorship_requests smr
     INNER JOIN student_profiles sp ON sp.id = smr.student_profile_id
     INNER JOIN users u ON u.id = sp.user_id
     WHERE smr.id = $1::uuid AND smr.student_profile_id = $2::uuid`,
    [id, studentId],
  );
  return r.rows[0] || null;
}

async function __platform_GET(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { id } = await params;
    const row = await loadRequestForStudent(id, studentId);
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const volunteers = row.status === 'approved' ? await loadVolunteers(id) : [];
    return NextResponse.json({ item: mapMentorshipRequestRow(row, { volunteers }) });
  } catch (e) {
    console.error('GET /api/student/mentorship-requests/[id]', e);
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
  }
}

async function __platform_PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = await getOrCreateStudentProfileId(session.user.id);
    if (!studentId) {
      return NextResponse.json({ error: 'Student profile required' }, { status: 400 });
    }

    const { id } = await params;
    const existing = await loadRequestForStudent(id, studentId);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'close') {
      if (!['approved', 'submitted'].includes(existing.status)) {
        return NextResponse.json({ error: 'Only open requests can be closed' }, { status: 400 });
      }
      await query(
        `UPDATE student_mentorship_requests SET status = 'closed', updated_at = NOW() WHERE id = $1::uuid`,
        [id],
      );
      const row = await loadRequestForStudent(id, studentId);
      return NextResponse.json({ item: mapMentorshipRequestRow(row, { volunteers: [] }) });
    }

    if (action === 'submit') {
      if (!canStudentSubmitRequest(existing.status)) {
        return NextResponse.json({ error: 'This request cannot be submitted' }, { status: 400 });
      }
      await query(
        `UPDATE student_mentorship_requests
         SET status = 'submitted', college_note = NULL, reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()
         WHERE id = $1::uuid`,
        [id],
      );
      await notifyCollegeAdminsOfTenant(existing.tenant_id, {
        title: 'Mentorship request submitted',
        message: `A student submitted a mentorship request: ${existing.title}`,
        type: 'info',
        link: '/dashboard/college/mentorship-requests',
      });
      const row = await loadRequestForStudent(id, studentId);
      return NextResponse.json({ item: mapMentorshipRequestRow(row, { volunteers: [] }) });
    }

    if (!canStudentEditRequest(existing.status)) {
      return NextResponse.json({ error: 'This request cannot be edited' }, { status: 400 });
    }

    const validated = validateMentorshipRequestPayload(body, { partial: true });
    if (validated.error) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const parts = [];
    const vals = [];
    let n = 1;
    const d = validated.data;
    if (d.title !== undefined) {
      parts.push(`title = $${n++}`);
      vals.push(d.title);
    }
    if (d.summary !== undefined) {
      parts.push(`summary = $${n++}`);
      vals.push(d.summary);
    }
    if (d.topics !== undefined) {
      parts.push(`topics = $${n++}`);
      vals.push(d.topics);
    }
    if (d.preferredFormat !== undefined) {
      parts.push(`preferred_format = $${n++}`);
      vals.push(d.preferredFormat);
    }
    if (d.timeHint !== undefined) {
      parts.push(`time_hint = $${n++}`);
      vals.push(d.timeHint);
    }

    if (body.submit === true) {
      parts.push(`status = $${n++}`);
      vals.push('submitted');
      parts.push('college_note = NULL');
      parts.push('reviewed_by = NULL');
      parts.push('reviewed_at = NULL');
    }

    if (!parts.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    parts.push('updated_at = NOW()');
    vals.push(id, studentId);

    await query(
      `UPDATE student_mentorship_requests
       SET ${parts.join(', ')}
       WHERE id = $${n++}::uuid AND student_profile_id = $${n++}::uuid`,
      vals,
    );

    if (body.submit === true) {
      await notifyCollegeAdminsOfTenant(existing.tenant_id, {
        title: 'Mentorship request submitted',
        message: `A student submitted a mentorship request: ${d.title || existing.title}`,
        type: 'info',
        link: '/dashboard/college/mentorship-requests',
      });
    }

    const row = await loadRequestForStudent(id, studentId);
    const volunteers = row.status === 'approved' ? await loadVolunteers(id) : [];
    return NextResponse.json({ item: mapMentorshipRequestRow(row, { volunteers }) });
  } catch (e) {
    console.error('PATCH /api/student/mentorship-requests/[id]', e);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET, PATCH: __platform_PATCH },
  { context: 'api_student_mentorship_requests_id' },
);
export const GET = __platformApiHandlers.GET;
export const PATCH = __platformApiHandlers.PATCH;
