import { NextResponse } from 'next/server';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { auditNewValues, getRequestClientIp, writeAuditLog } from '@/lib/auditLog';
import {
  buildImpersonationResponsePayload,
  encodeSessionToken,
  isImpersonating,
  resolveImpersonationTarget,
} from '@/lib/impersonation';
import { applySessionCookiePolicy, SESSION_COOKIE_NAME, sessionTokenCookieOptions } from '@/lib/sessionPolicy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

async function __platform_POST(request) {
  const { session, error, status } = await requireSuperAdmin();
  if (error) {
    return NextResponse.json({ error }, { status: status || 401 });
  }

  if (isImpersonating(session)) {
    return NextResponse.json(
      { error: 'Exit the current proxy session before starting another.' },
      { status: 403 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const resolved = await resolveImpersonationTarget({
    type: body?.type,
    id: body?.id,
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status || 400 });
  }

  const startedAt = new Date().toISOString();
  const token = await encodeSessionToken(resolved.claims, {
    impersonatorId: session.user.id,
    impersonatorEmail: session.user.email || session.user.communication_email || null,
    impersonationStartedAt: startedAt,
  });

  void writeAuditLog({
    userId: session.user.id,
    tenantId: resolved.claims.tenantId || null,
    action: 'IMPERSONATION_START',
    entityType: resolved.entityType,
    entityId: resolved.entityId,
    newValues: auditNewValues(
      `Proxy login as ${resolved.claims.email} (${resolved.entityName || resolved.entityType})`,
      {
        targetUserId: resolved.claims.id,
        targetEmail: resolved.claims.email,
        targetRole: resolved.claims.role,
        entityName: resolved.entityName || null,
      },
    ),
    ipAddress: getRequestClientIp(request),
  });

  const payload = buildImpersonationResponsePayload(resolved.claims, {
    impersonatorId: session.user.id,
  });
  const response = NextResponse.json(payload);
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionTokenCookieOptions());
  return applySessionCookiePolicy(response);
}

const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_admin_impersonate' });
export const POST = __platformApiHandlers.POST;
