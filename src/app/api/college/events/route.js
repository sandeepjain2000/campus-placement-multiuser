import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { validatePlacementDate } from '@/lib/dateOnly';
import { validateTitlePayload } from '@/lib/apiInputValidation';
import { normalizeTitle } from '@/lib/validators';
import { AND_DRIVE_NOT_DELETED, AND_JP_NOT_DELETED } from '@/lib/softDeleteSql';
import {
  defaultBlockingForEventType,
  detectCalendarProgramClashes,
  formatClashSummary,
} from '@/lib/calendarClashDetection';
import { hasColumn } from '@/lib/migrationReady';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.user.tenantId || session.user.tenant_id;
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const hasSourceUid = await hasColumn('college_calendar', 'source_uid');
    const sourceSelect = hasSourceUid ? ', source_uid' : ', NULL::text AS source_uid';

    const [calendarRes, drivesRes] = await Promise.all([
      query(
        `SELECT id, title, event_type, start_date, end_date, is_blocking, description${sourceSelect}
         FROM college_calendar
         WHERE tenant_id = $1::uuid
         ORDER BY start_date DESC, created_at DESC
         LIMIT 2000`,
        [tenantId],
      ),
      query(
        `SELECT d.id, d.title, d.drive_date, d.status, ep.company_name
         FROM placement_drives d
         LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
         WHERE d.tenant_id = $1::uuid
           AND d.status IN ('approved', 'scheduled', 'in_progress')
           ${AND_DRIVE_NOT_DELETED}
         ORDER BY d.drive_date DESC NULLS LAST, d.created_at DESC
         LIMIT 200`,
        [tenantId],
      ),
    ]);

    const calendarEvents = calendarRes.rows.map((row) => {
      const imported = Boolean(row.source_uid && String(row.source_uid).trim());
      return {
        ...row,
        source: imported ? 'imported' : 'program',
        category: imported ? 'imported' : 'program',
      };
    });

    const driveEvents = drivesRes.rows.map((d) => ({
      id: `drive-${d.id}`,
      title: d.company_name ? `${d.company_name} — ${d.title}` : d.title,
      event_type: 'placement_drive',
      start_date: d.drive_date,
      end_date: d.drive_date,
      is_blocking: false,
      description: `Placement drive · ${d.status || 'scheduled'}`,
      source: 'placement_drive',
      category: 'placement',
      source_uid: null,
    }));

    return NextResponse.json({ events: [...calendarEvents, ...driveEvents] });
  } catch (error) {
    console.error('GET /api/college/events', error);
    return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.user.tenantId || session.user.tenant_id;
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const title = normalizeTitle(body?.title);
    const eventType = String(body?.eventType || 'other').trim();
    const startDate = String(body?.startDate || '').trim();
    const endDate = String(body?.endDate || startDate).trim();
    const description = String(body?.description || '').trim();
    const isBlocking =
      body?.isBlocking != null ? Boolean(body.isBlocking) : defaultBlockingForEventType(eventType);

    const allowedTypes = new Set(['exam', 'holiday', 'festival', 'placement_drive', 'interview_slot', 'workshop', 'other']);
    if (!title || !startDate || !allowedTypes.has(eventType)) {
      return NextResponse.json({ error: 'title, eventType and startDate are required' }, { status: 400 });
    }
    const titleErr = validateTitlePayload(title, { label: 'Event title' });
    if (titleErr) {
      return NextResponse.json({ error: titleErr }, { status: 400 });
    }

    const startCheck = validatePlacementDate(startDate, { allowPast: false });
    if (!startCheck.ok) {
      return NextResponse.json({ error: startCheck.error }, { status: 400 });
    }
    const endCheck = validatePlacementDate(endDate || startDate, { allowPast: false });
    if (!endCheck.ok) {
      return NextResponse.json({ error: endCheck.error }, { status: 400 });
    }

    const clashPreview = await detectCalendarProgramClashes(
      query,
      tenantId,
      startCheck.value,
      endCheck.value,
    );

    await query(
      `INSERT INTO college_calendar (tenant_id, title, event_type, start_date, end_date, is_blocking, description)
       VALUES ($1::uuid, $2, $3, $4::date, $5::date, $6, $7)`,
      [tenantId, title, eventType, startCheck.value, endCheck.value, isBlocking, description || null]
    );

    const driveClashes = clashPreview.clashes;
    return NextResponse.json({
      success: true,
      hasDriveClashes: driveClashes.length > 0,
      driveClashes,
      warning:
        driveClashes.length > 0
          ? formatClashSummary(driveClashes)
          : null,
    });
  } catch (error) {
    console.error('POST /api/college/events', error);
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_college_events' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
