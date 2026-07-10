import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { runSemesterRolloverAllTenants } from '@/lib/studentSemesterRollover';

export const dynamic = 'force-dynamic';

function authorizeCron(request) {
  const secret = process.env.CRON_SECRET || process.env.SEMESTER_ROLLOVER_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === secret;
}

async function __platform_POST(request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const force = Boolean(body?.force);
  const dryRun = Boolean(body?.dryRun);
  const asOfDate = body?.asOfDate ? new Date(body.asOfDate) : new Date();
  const tenantId = body?.tenantId ? String(body.tenantId).trim() : null;

  if (tenantId) {
    const { runSemesterRolloverForTenant } = await import('@/lib/studentSemesterRollover');
    const result = await runSemesterRolloverForTenant(tenantId, {
      force,
      dryRun,
      asOfDate,
      triggeredBy: 'cron',
    });
    return NextResponse.json({ ok: true, ...result });
  }

  const result = await runSemesterRolloverAllTenants({ force, asOfDate, dryRun });

  return NextResponse.json({ ok: true, ...result });
}

export const { POST } = withApiHandlers({ POST: __platform_POST });
