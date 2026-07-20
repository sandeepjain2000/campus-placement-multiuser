import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { hasColumn } from '@/lib/migrationReady';
import { toDateOnlyString, validatePlacementDate } from '@/lib/dateOnly';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireCollegeAdmin(session) {
  if (!session?.user || session.user.role !== 'college_admin') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const tenantId = session.user.tenantId || session.user.tenant_id;
  if (!tenantId) {
    return { error: NextResponse.json({ error: 'Tenant context missing' }, { status: 400 }) };
  }
  return { tenantId };
}

function parseDateRange(fromRaw, toRaw) {
  const fromDate = String(fromRaw || '').trim() || null;
  const toDate = String(toRaw || '').trim() || null;

  if (fromDate) {
    const check = validatePlacementDate(fromDate, { allowPast: true });
    if (!check.ok) return { error: `From date: ${check.error}` };
  }
  if (toDate) {
    const check = validatePlacementDate(toDate, { allowPast: true });
    if (!check.ok) return { error: `To date: ${check.error}` };
  }
  if (fromDate && toDate && fromDate > toDate) {
    return { error: 'From date cannot be after to date.' };
  }
  return { fromDate, toDate };
}

async function countImported(tenantId, fromDate, toDate) {
  const params = [tenantId];
  let sql = `
    SELECT COUNT(*)::int AS count,
           MIN(start_date)::text AS earliest,
           MAX(COALESCE(end_date, start_date))::text AS latest
    FROM college_calendar
    WHERE tenant_id = $1::uuid
      AND source_uid IS NOT NULL
      AND length(trim(source_uid)) > 0
  `;
  if (fromDate) {
    params.push(fromDate);
    sql += ` AND COALESCE(end_date, start_date) >= $${params.length}::date`;
  }
  if (toDate) {
    params.push(toDate);
    sql += ` AND start_date <= $${params.length}::date`;
  }
  const res = await query(sql, params);
  return {
    count: Number(res.rows[0]?.count) || 0,
    earliest: toDateOnlyString(res.rows[0]?.earliest) || null,
    latest: toDateOnlyString(res.rows[0]?.latest) || null,
  };
}

async function __platform_GET(request) {
  const session = await getServerSession(authOptions);
  const auth = requireCollegeAdmin(session);
  if (auth.error) return auth.error;

  if (!(await hasColumn('college_calendar', 'source_uid'))) {
    return NextResponse.json({
      count: 0,
      earliest: null,
      latest: null,
      available: false,
      message: 'Imported-event tracking is not available on this database yet.',
    });
  }

  const { searchParams } = new URL(request.url);
  const range = parseDateRange(searchParams.get('fromDate'), searchParams.get('toDate'));
  if (range.error) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  const summary = await countImported(auth.tenantId, range.fromDate, range.toDate);
  return NextResponse.json({ ...summary, available: true, fromDate: range.fromDate, toDate: range.toDate });
}

async function __platform_DELETE(request) {
  const session = await getServerSession(authOptions);
  const auth = requireCollegeAdmin(session);
  if (auth.error) return auth.error;

  if (!(await hasColumn('college_calendar', 'source_uid'))) {
    return NextResponse.json(
      { error: 'Imported-event tracking is not available. Run migration 112 first.' },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const scope = String(body?.scope || 'range').toLowerCase();
  const range =
    scope === 'all'
      ? { fromDate: null, toDate: null }
      : parseDateRange(body?.fromDate, body?.toDate);

  if (range.error) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  if (scope !== 'all' && !range.fromDate && !range.toDate) {
    return NextResponse.json(
      { error: 'Choose a date range, or delete all imported events.' },
      { status: 400 },
    );
  }

  const before = await countImported(auth.tenantId, range.fromDate, range.toDate);
  if (before.count === 0) {
    return NextResponse.json({
      success: true,
      deleted: 0,
      message: 'No imported events matched that selection.',
      fromDate: range.fromDate,
      toDate: range.toDate,
    });
  }

  const params = [auth.tenantId];
  let sql = `
    DELETE FROM college_calendar
    WHERE tenant_id = $1::uuid
      AND source_uid IS NOT NULL
      AND length(trim(source_uid)) > 0
  `;
  if (range.fromDate) {
    params.push(range.fromDate);
    sql += ` AND COALESCE(end_date, start_date) >= $${params.length}::date`;
  }
  if (range.toDate) {
    params.push(range.toDate);
    sql += ` AND start_date <= $${params.length}::date`;
  }
  sql += ' RETURNING id';

  const result = await query(sql, params);
  const deleted = result.rowCount || 0;

  return NextResponse.json({
    success: true,
    deleted,
    fromDate: range.fromDate,
    toDate: range.toDate,
    message:
      deleted > 0
        ? `Deleted ${deleted} imported event${deleted === 1 ? '' : 's'}.`
        : 'No imported events were deleted.',
  });
}

const __platformApiHandlers = withApiHandlers(
  {
    GET: __platform_GET,
    DELETE: __platform_DELETE,
  },
  { context: 'api_college_calendar_imported' },
);
export const GET = __platformApiHandlers.GET;
export const DELETE = __platformApiHandlers.DELETE;
