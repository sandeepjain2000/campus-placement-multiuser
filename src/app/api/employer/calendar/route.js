import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { toDateOnlyString } from '@/lib/dateOnly';
import { placementDriveNotDeletedSql } from '@/lib/migrationReady';
import {
  buildPlatformErrorResponse,
  PLATFORM_ERROR_CONTEXT,
} from '@/lib/platformErrorLog';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

async function __platform_GET(request) {
  let session = null;
  let employerId = null;

  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id || session.user.sub;
    const empRes = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid`, [userId]);
    employerId = empRes.rows[0]?.id;
    if (!employerId) return NextResponse.json({ events: [] });

    const driveDelSql = await placementDriveNotDeletedSql('d');

    const eventsRes = await query(
      `SELECT d.id, d.title, d.drive_date, d.drive_type, d.status, t.name AS college
       FROM placement_drives d
       LEFT JOIN tenants t ON t.id = d.tenant_id
       WHERE d.employer_id = $1::uuid ${driveDelSql}
       ORDER BY d.drive_date DESC NULLS LAST, d.created_at DESC
       LIMIT 500`,
      [employerId],
    );

    const events = eventsRes.rows.map((r) => ({
      id: r.id,
      title: r.title || 'Placement Drive',
      date: toDateOnlyString(r.drive_date),
      time: '',
      type: r.status || 'scheduled',
      mode: r.drive_type || 'on_campus',
      college: r.college || '',
    }));

    const sessionUserId = session.user.id || session.user.sub;

    const approvals = await query(
      `SELECT tenant_id FROM employer_approvals
       WHERE employer_id = $1::uuid AND status = 'approved'`,
      [employerId],
    );

    for (const row of approvals.rows) {
      const tenantRes = await query(`SELECT settings, name FROM tenants WHERE id = $1::uuid`, [row.tenant_id]);
      const tenant = tenantRes.rows[0];
      if (!tenant) continue;
      const plans = Array.isArray(tenant.settings?.employerInterviewPlans)
        ? tenant.settings.employerInterviewPlans
        : [];
      for (const p of plans) {
        if (p.employerUserId !== sessionUserId) continue;
        const date = toDateOnlyString(p.date);
        if (!date) continue;
        events.push({
          id: p.id || `ei-${date}-${p.round}`,
          title: `${p.campus || tenant.name} — ${p.round}`,
          date,
          time: p.time || '',
          type: 'interview',
          mode: p.mode || 'Virtual',
          college: p.campus || tenant.name || '',
        });
      }
    }

    events.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('GET /api/employer/calendar', error);
    const { status, body: errBody } = await buildPlatformErrorResponse(error, {
      context: PLATFORM_ERROR_CONTEXT.EMPLOYER_CALENDAR,
      request,
      sessionUser: session?.user,
      employerId: employerId || null,
      defaultMessage: 'Failed to load calendar events',
    });
    return NextResponse.json(errBody, { status });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_calendar' });
export const GET = __platformApiHandlers.GET;
