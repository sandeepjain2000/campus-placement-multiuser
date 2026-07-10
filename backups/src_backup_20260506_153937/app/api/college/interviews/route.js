import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

function getTenantId(session) {
  return session?.user?.tenantId || session?.user?.tenant_id || null;
}

function parseMeta(description) {
  if (!description) {
    return { company: '', round: '', startTime: '', endTime: '', interviewer: '', panelNames: '', students: [], createdBy: 'TPO' };
  }
  try {
    const parsed = JSON.parse(description);
    return {
      company: parsed.company || '',
      round: parsed.round || '',
      startTime: parsed.startTime || '',
      endTime: parsed.endTime || '',
      interviewer: parsed.interviewer || '',
      panelNames: parsed.panelNames || '',
      students: Array.isArray(parsed.students) ? parsed.students : [],
      createdBy: parsed.createdBy || 'TPO',
    };
  } catch {
    return { company: '', round: '', startTime: '', endTime: '', interviewer: '', panelNames: '', students: [], createdBy: 'TPO' };
  }
}

export async function GET() {
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

    const slots = result.rows.map((r) => {
      const meta = parseMeta(r.description);
      return {
        id: r.id,
        company: meta.company || r.title || '',
        round: meta.round || '',
        date: r.start_date ? String(r.start_date).slice(0, 10) : '',
        startTime: meta.startTime,
        endTime: meta.endTime,
        interviewer: meta.interviewer,
        panelNames: meta.panelNames,
        students: meta.students,
        createdBy: meta.createdBy,
      };
    });

    const resultsRes = await query(
      `SELECT a.id,
              COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), u.email, 'Unknown Student') AS student,
              ep.company_name AS company,
              COALESCE(d.title, 'Interview Round') AS round,
              a.status AS outcome,
              d.drive_date AS date
       FROM applications a
       JOIN student_profiles sp ON sp.id = a.student_id
       LEFT JOIN users u ON u.id = sp.user_id
       LEFT JOIN placement_drives d ON d.id = a.drive_id
       LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
       WHERE sp.tenant_id = $1::uuid
         AND a.status IN ('shortlisted', 'selected', 'rejected', 'in_progress')
       ORDER BY a.updated_at DESC NULLS LAST, a.applied_at DESC
       LIMIT 500`,
      [tenantId],
    );

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
      round: r.round || 'Interview',
      outcome: outcomeMap[r.outcome] || 'Pending',
      date: r.date ? String(r.date).slice(0, 10) : '',
    }));

    return NextResponse.json({ slots, results });
  } catch (error) {
    console.error('GET /api/college/interviews failed:', error);
    return NextResponse.json({ error: 'Failed to load interview slots' }, { status: 500 });
  }
}

export async function POST(request) {
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

    const title = `${company} • ${round}`;
    const desc = JSON.stringify({ company, round, startTime, endTime, interviewer, panelNames, students, createdBy });

    const inserted = await query(
      `INSERT INTO college_calendar (tenant_id, title, event_type, start_date, end_date, is_blocking, description)
       VALUES ($1::uuid, $2, 'interview_slot', $3::date, $3::date, false, $4)
       RETURNING id, title, start_date, description`,
      [tenantId, title, date, desc],
    );

    const row = inserted.rows[0];
    return NextResponse.json({
      slot: {
        id: row.id,
        company,
        round,
        date: String(row.start_date).slice(0, 10),
        startTime,
        endTime,
        interviewer,
        panelNames,
        students,
        createdBy,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/college/interviews failed:', error);
    return NextResponse.json({ error: 'Failed to create interview slot' }, { status: 500 });
  }
}
