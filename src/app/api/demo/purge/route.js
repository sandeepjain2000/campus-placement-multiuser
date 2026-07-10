import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isDemoDataApiEnabled, demoDataDisabledResponse } from '@/lib/demoDataAccess';
import { listDemoPurgeCandidates, purgeDemoEntity } from '@/lib/demoPurgeFactory';
import { getRequestClientIp } from '@/lib/auditLog';
import { getSessionTenantId, isUuid } from '@/lib/tenantContext';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;






async function __platform_GET(request) {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId')?.trim() || undefined;
    const candidates = await listDemoPurgeCandidates({ tenantId });
    return NextResponse.json({ ok: true, candidates });
  } catch (e) {
    console.error('GET /api/demo/purge', e);
    const msg = String(e.message || '');
    if (e.code === '42703' || msg.includes('is_deleted') || msg.includes('demo_purge_transactions')) {
      return NextResponse.json(
        {
          error: 'Purge tables not migrated. Run db/migrations/066_demo_soft_delete_purge.sql',
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to list purge candidates' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  if (!isDemoDataApiEnabled()) return demoDataDisabledResponse();
  try {
    const body = await request.json().catch(() => ({}));
    const entityType = body?.entityType ?? body?.type;
    const entityId = body?.entityId ?? body?.id;
    const session = await getServerSession(authOptions);
    const requestedTenant = body?.tenantId != null ? String(body.tenantId).trim() : '';
    const sessionTenant = session?.user ? getSessionTenantId(session.user) : null;
    const tenantId =
      requestedTenant && isUuid(requestedTenant)
        ? requestedTenant
        : sessionTenant && isUuid(sessionTenant)
          ? sessionTenant
          : null;

    const result = await purgeDemoEntity(entityType, entityId, {
      userId: session?.user?.id || null,
      tenantId,
      ipAddress: getRequestClientIp(request),
    });
    return NextResponse.json({ timestamp: new Date().toISOString(), ...result });
  } catch (e) {
    console.error('POST /api/demo/purge', e);
    const msg = String(e.message || '');
    if (e.code === '42703' || msg.includes('is_deleted') || msg.includes('demo_purge_transactions')) {
      return NextResponse.json(
        {
          error: 'Purge tables not migrated. Run db/migrations/066_demo_soft_delete_purge.sql',
        },
        { status: 503 },
      );
    }
    if (e.code === 'NOT_FOUND') {
      return NextResponse.json({ ok: false, error: e.message }, { status: 404 });
    }
    if (e.code === 'BAD_REQUEST') {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: e.message || 'Purge failed' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
  POST: __platform_POST,
}, { context: 'api_demo_purge' });
export const GET = __platformApiHandlers.GET;
export const POST = __platformApiHandlers.POST;
