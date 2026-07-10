import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { validatePlacementDate } from '@/lib/dateOnly';
import {
  detectCalendarProgramClashes,
  detectDriveApprovalClashes,
} from '@/lib/calendarClashDetection';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.user.tenantId || session.user.tenant_id;
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const startDate = String(searchParams.get('startDate') || '').trim();
    const endDate = String(searchParams.get('endDate') || startDate).trim();
    const driveId = String(searchParams.get('driveId') || '').trim();
    const driveDate = String(searchParams.get('driveDate') || '').trim();

    if (driveId || driveDate) {
      const dateCheck = validatePlacementDate(driveDate, { allowPast: true });
      if (!dateCheck.ok) {
        return NextResponse.json({ error: dateCheck.error }, { status: 400 });
      }
      const result = await detectDriveApprovalClashes(query, tenantId, dateCheck.value, {
        excludeDriveId: driveId || null,
      });
      return NextResponse.json({
        mode: 'drive',
        hasClashes: result.clashes.length > 0,
        bufferDays: result.bufferDays,
        rangeStart: result.rangeStart,
        rangeEnd: result.rangeEnd,
        clashes: result.clashes,
      });
    }

    const startCheck = validatePlacementDate(startDate, { allowPast: true });
    if (!startCheck.ok) {
      return NextResponse.json({ error: startCheck.error }, { status: 400 });
    }
    const endCheck = validatePlacementDate(endDate || startDate, { allowPast: true });
    if (!endCheck.ok) {
      return NextResponse.json({ error: endCheck.error }, { status: 400 });
    }

    const result = await detectCalendarProgramClashes(query, tenantId, startCheck.value, endCheck.value);
    return NextResponse.json({
      mode: 'calendar',
      hasClashes: result.clashes.length > 0,
      clashes: result.clashes,
      startDate: result.startDate,
      endDate: result.endDate,
    });
  } catch (error) {
    console.error('GET /api/college/calendar-clashes', error);
    return NextResponse.json({ error: 'Failed to check calendar clashes' }, { status: 500 });
  }
}

const __platformApiHandlers = withApiHandlers(
  { GET: __platform_GET },
  { context: 'api_college_calendar_clashes' },
);
export const GET = __platformApiHandlers.GET;
