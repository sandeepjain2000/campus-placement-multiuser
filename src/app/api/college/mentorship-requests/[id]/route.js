import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  mapMentorshipRequestRow,
  mapMentorshipVolunteerRow,
  MENTORSHIP_REQUEST_LIST_SQL,
  validateMentorshipRequestPayload,
} from '@/lib/studentMentorshipRequest';
import { notifyUsersOneAtATime } from '@/lib/notificationService';

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

async function loadRequest(id, tenantId) {
  const r = await query(
    `SELECT ${MENTORSHIP_REQUEST_LIST_SQL}
     FROM student_mentorship_requests smr
     INNER JOIN student_profiles sp ON sp.id = smr.student_profile_id
     INNER JOIN users u ON u.id = sp.user_id
     WHERE smr.id = $1::uuid AND smr.tenant_id = $2::uuid`,
    [id, tenantId],
  );
  return r.rows[0] || null;
}

async function notifyStudentOfReview(studentProfileId, { title, message, link }) {
  const r = await query(`SELECT user_id FROM student_profiles WHERE id = $1::uuid`, [studentProfileId]);
  const userId = r.rows[0]?.user_id;
  if (!userId) return;
  await notifyUsersOneAtATime([userId], { title, message, type: 'info', link });
}

async function __platform_PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenant_id ?? session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const { id } = await params;
    const existing = await loadRequest(id, tenantId);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'approve') {
      if (existing.status !== 'submitted') {
        return NextResponse.json({ error: 'Only submitted requests can be approved' }, { status: 400 });
      }

      const validated = validateMentorshipRequestPayload(
        {
          title: body.title ?? existing.title,
          summary: body.summary ?? existing.summary,
          topics: body.topics ?? existing.topics,
          preferredFormat: body.preferredFormat ?? body.preferred_format ?? existing.preferred_format,
          timeHint: body.timeHint ?? body.time_hint ?? existing.time_hint,
        },
        { partial: false },
      );
      if (validated.error) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }

      const { title, summary, topics, preferredFormat, timeHint } = validated.data;
      const collegeNote = String(body.collegeNote ?? body.college_note ?? '').trim() || null;

      await query(
        `UPDATE student_mentorship_requests
         SET title = $1, summary = $2, topics = $3, preferred_format = $4, time_hint = $5,
             college_note = $6, status = 'approved',
             reviewed_by = $7::uuid, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $8::uuid AND tenant_id = $9::uuid`,
        [
          title,
          summary,
          topics,
          preferredFormat,
          timeHint,
          collegeNote,
          session.user.id,
          id,
          tenantId,
        ],
      );

      await notifyStudentOfReview(existing.student_profile_id, {
        title: 'Mentorship request approved',
        message: `Your mentorship request "${title}" is now open for employer volunteers.`,
        link: '/dashboard/student/mentorship-requests',
      });

      const row = await loadRequest(id, tenantId);
      return NextResponse.json({ item: mapMentorshipRequestRow(row, { volunteers: [] }) });
    }

    if (action === 'reject') {
      if (existing.status !== 'submitted') {
        return NextResponse.json({ error: 'Only submitted requests can be rejected' }, { status: 400 });
      }
      const collegeNote = String(body.collegeNote ?? body.college_note ?? '').trim();
      if (!collegeNote) {
        return NextResponse.json({ error: 'A note to the student is required when rejecting' }, { status: 400 });
      }

      await query(
        `UPDATE student_mentorship_requests
         SET status = 'rejected', college_note = $1,
             reviewed_by = $2::uuid, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $3::uuid AND tenant_id = $4::uuid`,
        [collegeNote, session.user.id, id, tenantId],
      );

      await notifyStudentOfReview(existing.student_profile_id, {
        title: 'Mentorship request not approved',
        message: collegeNote,
        link: '/dashboard/student/mentorship-requests',
      });

      const row = await loadRequest(id, tenantId);
      return NextResponse.json({ item: mapMentorshipRequestRow(row, { volunteers: [] }) });
    }

    if (existing.status === 'submitted') {
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

      if (!parts.length) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      parts.push('updated_at = NOW()');
      vals.push(id, tenantId);

      await query(
        `UPDATE student_mentorship_requests
         SET ${parts.join(', ')}
         WHERE id = $${n++}::uuid AND tenant_id = $${n++}::uuid AND status = 'submitted'`,
        vals,
      );

      const row = await loadRequest(id, tenantId);
      return NextResponse.json({ item: mapMentorshipRequestRow(row, { volunteers: [] }) });
    }

    return NextResponse.json({ error: 'This request cannot be updated' }, { status: 400 });
  } catch (e) {
    console.error('PATCH /api/college/mentorship-requests/[id]', e);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { PATCH: __platform_PATCH },
  { context: 'api_college_mentorship_requests_id' },
);
export const PATCH = __platformApiHandlers.PATCH;
