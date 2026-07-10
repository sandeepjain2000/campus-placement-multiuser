import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { toDateOnlyString, validateInterviewDateTime } from '@/lib/dateOnly';
import { buildCollegeInterviewDescription, mapCollegeInterviewRow } from '@/lib/collegeInterviewSlot';
import {
  AND_APP_NOT_DELETED,
  AND_DRIVE_NOT_DELETED,
  AND_JP_NOT_DELETED,
} from '@/lib/softDeleteSql';
import { SP_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

function getTenantId(session) {
  return session?.user?.tenantId || session?.user?.tenant_id || null;
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const result = await query(
      `SELECT id, title, start_date, description
       FROM college_calendar
       WHERE tenant_id = $1::uuid AND event_type = 'interview_slot'
       ORDER BY start_date ASC, created_at DESC`,
      [tenantId],
    );

    const slots = result.rows.map((r) => mapCollegeInterviewRow(r));

    let resultsRes;
    try {
      resultsRes = await query(
        `SELECT a.id,
                COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student,
                ep.company_name AS company,
                ep.website AS website,
                COALESCE(d.title, 'Interview Round') AS round,
                a.status AS outcome,
                COALESCE(d.drive_date, a.applied_at::date) AS date
         FROM applications a
         JOIN student_profiles sp ON sp.id = a.student_id AND sp.tenant_id = $1::uuid
         LEFT JOIN users u ON u.id = sp.user_id
         LEFT JOIN placement_drives d ON d.id = a.drive_id
         LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
         WHERE ${SP_ACTIVE_CLAUSE}
           AND a.status IN ('shortlisted', 'selected', 'rejected', 'in_progress')
           ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}
         ORDER BY a.updated_at DESC NULLS LAST, a.applied_at DESC
         LIMIT 500`,
        [tenantId],
      );
    } catch (e) {
      if (e?.code !== '42703' || !String(e?.message || '').includes('archived')) throw e;
      resultsRes = await query(
        `SELECT a.id,
                COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student,
                ep.company_name AS company,
                ep.website AS website,
                COALESCE(d.title, 'Interview Round') AS round,
                a.status AS outcome,
                COALESCE(d.drive_date, a.applied_at::date) AS date
         FROM applications a
         JOIN student_profiles sp ON sp.id = a.student_id AND sp.tenant_id = $1::uuid
         LEFT JOIN users u ON u.id = sp.user_id
         LEFT JOIN placement_drives d ON d.id = a.drive_id
         LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
         WHERE a.status IN ('shortlisted', 'selected', 'rejected', 'in_progress')
           ${AND_APP_NOT_DELETED} ${AND_DRIVE_NOT_DELETED}
         ORDER BY a.updated_at DESC NULLS LAST, a.applied_at DESC
         LIMIT 500`,
        [tenantId],
      );
    }

    const outcomeMap = {
      shortlisted: 'Shortlisted',
      selected: 'Selected',
      rejected: 'Rejected',
      in_progress: 'Pending',
    };
    const results = resultsRes.rows.map((r) => ({
      id: r.id,
      student: r.student,
      company: r.company || '—',
      website: r.website || null,
      round: r.round || 'Interview',
      outcome: outcomeMap[r.outcome] || 'Pending',
      date: toDateOnlyString(r.date),
    }));

    return NextResponse.json({ slots, results });
  } catch (error) {
    console.error('GET /api/college/interviews failed:', error);
    return NextResponse.json({ error: 'Failed to load interview slots' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const company = String(body?.company || '').trim();
    const round = String(body?.round || '').trim();
    const date = String(body?.date || '').trim();
    const startTime = String(body?.startTime || '').trim();
    const endTime = String(body?.endTime || '').trim();
    const interviewer = String(body?.interviewer || '').trim();
    const panelNames = String(body?.panelNames || '').trim();
    const createdBy = String(body?.createdBy || 'TPO').trim();
    const students = Array.isArray(body?.students) ? body.students.map((s) => String(s).trim()).filter(Boolean) : [];

    if (!company || !round || !date || !startTime || !endTime || !interviewer) {
      return NextResponse.json({ error: 'company, round, date, startTime, endTime, and interviewer are required' }, { status: 400 });
    }

    const dateTimeCheck = validateInterviewDateTime(date, startTime, { allowPast: false });
    if (!dateTimeCheck.ok) {
      return NextResponse.json({ error: dateTimeCheck.error }, { status: 400 });
    }

    const title = `${company} • ${round}`;
    const desc = buildCollegeInterviewDescription({
      company,
      round,
      startTime,
      endTime,
      interviewer,
      panelNames,
      students,
      createdBy,
    });

    const inserted = await query(
      `INSERT INTO college_calendar (tenant_id, title, event_type, start_date, end_date, is_blocking, description)
       VALUES ($1::uuid, $2, 'interview_slot', $3::date, $3::date, false, $4)
       RETURNING id, title, start_date, description`,
      [tenantId, title, dateTimeCheck.value.date, desc],
    );

    const row = inserted.rows[0];
    return NextResponse.json({ slot: mapCollegeInterviewRow(row) }, { status: 201 });
  } catch (error) {
    console.error('POST /api/college/interviews failed:', error);
    return NextResponse.json({ error: 'Failed to create interview slot' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_college_interviews' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
