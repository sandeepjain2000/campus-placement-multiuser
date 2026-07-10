import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { normalizeTimeHm, toDateOnlyString, validateInterviewDateTime } from '@/lib/dateOnly';
import {
  buildCollegeInterviewDescription,
  mapCollegeInterviewRow,
  parseCollegeInterviewMeta,
} from '@/lib/collegeInterviewSlot';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

function getTenantId(session) {
  return session?.user?.tenantId || session?.user?.tenant_id || null;
}

async function loadSlot(tenantId, id) {
  const result = await query(
    `SELECT id, title, start_date, description
     FROM college_calendar
     WHERE id = $1::uuid AND tenant_id = $2::uuid AND event_type = 'interview_slot'
     LIMIT 1`,
    [id, tenantId],
  );
  return result.rows[0] || null;
}

function parseInterviewBody(body) {
  const company = String(body?.company || '').trim();
  const round = String(body?.round || '').trim();
  const date = String(body?.date || '').trim();
  const startTime = String(body?.startTime || '').trim();
  const endTime = String(body?.endTime || '').trim();
  const interviewer = String(body?.interviewer || '').trim();
  const panelNames = String(body?.panelNames || '').trim();
  const createdBy = String(body?.createdBy || 'TPO').trim();
  const students = Array.isArray(body?.students)
    ? body.students.map((s) => String(s).trim()).filter(Boolean)
    : [];
  return { company, round, date, startTime, endTime, interviewer, panelNames, createdBy, students };
}

async function __platform_PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const { id } = await params;
    const existing = await loadSlot(tenantId, id);
    if (!existing) return NextResponse.json({ error: 'Interview slot not found' }, { status: 404 });

    const body = await request.json();
    const fields = parseInterviewBody(body);
    if (
      !fields.company ||
      !fields.round ||
      !fields.date ||
      !fields.startTime ||
      !fields.endTime ||
      !fields.interviewer
    ) {
      return NextResponse.json(
        { error: 'company, round, date, startTime, endTime, and interviewer are required' },
        { status: 400 },
      );
    }

    const existingDate = toDateOnlyString(existing.start_date);
    const existingStartTime = parseCollegeInterviewMeta(existing.description).startTime;
    const allowPast =
      toDateOnlyString(fields.date) === existingDate &&
      normalizeTimeHm(fields.startTime) === normalizeTimeHm(existingStartTime);
    const dateTimeCheck = validateInterviewDateTime(fields.date, fields.startTime, { allowPast });
    if (!dateTimeCheck.ok) {
      return NextResponse.json({ error: dateTimeCheck.error }, { status: 400 });
    }

    const title = `${fields.company} • ${fields.round}`;
    const desc = buildCollegeInterviewDescription(fields);

    const updated = await query(
      `UPDATE college_calendar
       SET title = $1,
           start_date = $2::date,
           end_date = $2::date,
           description = $3
       WHERE id = $4::uuid AND tenant_id = $5::uuid AND event_type = 'interview_slot'
       RETURNING id, title, start_date, description`,
      [title, dateTimeCheck.value.date, desc, id, tenantId],
    );

    const row = updated.rows[0];
    return NextResponse.json({ slot: mapCollegeInterviewRow(row) });
  } catch (error) {
    console.error('PATCH /api/college/interviews/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update interview slot' }, { status: 500 });
  }
}

async function __platform_DELETE(_request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const { id } = await params;
    const del = await query(
      `DELETE FROM college_calendar
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND event_type = 'interview_slot'
       RETURNING id`,
      [id, tenantId],
    );
    if (!del.rows?.length) {
      return NextResponse.json({ error: 'Interview slot not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/college/interviews/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete interview slot' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  PATCH: __platform_PATCH,
  DELETE: __platform_DELETE,
}, { context: 'api_college_interviews_id' });
export const PATCH = __platformApiHandlers.PATCH;
export const DELETE = __platformApiHandlers.DELETE;
