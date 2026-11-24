import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { authOptions } from '@/lib/auth';
import { auditNewValues, getRequestClientIp, writeAuditLog } from '@/lib/auditLog';
import {
  buildImpersonationResponsePayload,
  encodeSessionToken,
  getImpersonatorId,
  isImpersonating,
  loadUserRowForSession,
  sessionClaimsFromUserRow,
} from '@/lib/impersonation';
import { applySessionCookiePolicy, SESSION_COOKIE_NAME, sessionTokenCookieOptions } from '@/lib/sessionPolicy';
import { getSessionUserId } from '@/lib/sessionUser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

async function __platform_POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isImpersonating(session)) {
    return NextResponse.json({ error: 'Not in a proxy session.' }, { status: 400 });
  }

  const impersonatorId = getImpersonatorId(session);
  const targetUserId = getSessionUserId(session);
  const targetEmail = session.user.email || null;
  const targetTenantId = session.user.tenantId || session.user.tenant_id || null;

  const adminRow = await loadUserRowForSession(impersonatorId);
  if (!adminRow || adminRow.role !== 'super_admin' || !adminRow.is_active) {
    return NextResponse.json(
      { error: 'Unable to restore Super Admin session. Sign in again.' },
      { status: 403 },
    );
  }

  const claims = sessionClaimsFromUserRow(adminRow);
  const token = await encodeSessionToken(claims, {});

  void writeAuditLog({
    userId: impersonatorId,
    tenantId: targetTenantId,
    action: 'IMPERSONATION_END',
    entityType: 'user',
    entityId: targetUserId,
    newValues: auditNewValues(`Exited proxy session for ${targetEmail || targetUserId}`, {
      targetUserId,
      targetEmail,
      targetRole: session.user.role || null,
    }),
    ipAddress: getRequestClientIp(request),
  });

  const payload = buildImpersonationResponsePayload(claims, {});
  const response = NextResponse.json(payload);
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionTokenCookieOptions());
  return applySessionCookiePolicy(response);
}

const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_admin_impersonate_stop' });
export const POST = __platformApiHandlers.POST;
