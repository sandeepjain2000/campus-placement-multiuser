import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { AND_DRIVE_NOT_DELETED } from '@/lib/softDeleteSql';
import { hasColumn } from '@/lib/migrationReady';
import { buildCollegeCalendarIcs, addDaysLocalYmd } from '@/lib/icsExport';
import { toDateOnlyString } from '@/lib/dateOnly';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'college_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tenantId = session.user.tenantId || session.user.tenant_id;
  if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const scope = String(searchParams.get('scope') || 'full').toLowerCase();
  const year = Number(searchParams.get('year')) || null;
  const month = Number(searchParams.get('month')); // 1-12 when scope=month

  const hasSourceUid = await hasColumn('college_calendar', 'source_uid');
  const sourceSelect = hasSourceUid ? ', source_uid' : ', NULL::text AS source_uid';

  const [calendarRes, drivesRes, tenantRes] = await Promise.all([
    query(
      `SELECT id, title, event_type, start_date, end_date, is_blocking, description${sourceSelect}
       FROM college_calendar
       WHERE tenant_id = $1::uuid
       ORDER BY start_date ASC, created_at ASC
       LIMIT 5000`,
      [tenantId],
    ),
    query(
      `SELECT d.id, d.title, d.drive_date, d.status, ep.company_name
       FROM placement_drives d
       LEFT JOIN employer_profiles ep ON ep.id = d.employer_id
       WHERE d.tenant_id = $1::uuid
         AND d.status IN ('approved', 'scheduled', 'in_progress')
         ${AND_DRIVE_NOT_DELETED}
       ORDER BY d.drive_date ASC NULLS LAST
       LIMIT 1000`,
      [tenantId],
    ),
    query(`SELECT name FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]),
  ]);

  const driveEvents = drivesRes.rows.map((d) => ({
    id: `drive-${d.id}`,
    title: d.company_name ? `${d.company_name} — ${d.title}` : d.title,
    event_type: 'placement_drive',
    start_date: d.drive_date,
    end_date: d.drive_date,
    is_blocking: false,
    description: `Placement drive · ${d.status || 'scheduled'}`,
    source: 'placement_drive',
    source_uid: `drive-${d.id}@placementhub.local`,
  }));

  let events = [...calendarRes.rows, ...driveEvents];

  if (scope === 'month' && year && month >= 1 && month <= 12) {
    const mm = String(month).padStart(2, '0');
    const monthStart = `${year}-${mm}-01`;
    // Day 0 of next month = last day of current month (local)
    const monthEnd = addDaysLocalYmd(
      month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`,
      -1,
    );
    events = events.filter((e) => {
      const start = toDateOnlyString(e.start_date);
      const end = toDateOnlyString(e.end_date) || start;
      if (!start) return false;
      return start <= monthEnd && end >= monthStart;
    });
  }

  events.sort((a, b) => {
    const sa = toDateOnlyString(a.start_date);
    const sb = toDateOnlyString(b.start_date);
    return sa.localeCompare(sb);
  });

  const tenantName = tenantRes.rows[0]?.name || session.user.tenantName || 'Campus';
  const calendarName = `${tenantName} — PlacementHub`;
  const ics = buildCollegeCalendarIcs(events, {
    calendarName,
    timezone: 'Asia/Kolkata',
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const scopeLabel =
    scope === 'month' && year && month
      ? `${year}-${String(month).padStart(2, '0')}`
      : 'full';
  const filename = `placementhub_calendar_${scopeLabel}_${stamp}.ics`;

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: 'api_college_calendar_export' },
);
export const GET = __platformApiHandlers.GET;
