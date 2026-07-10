import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeAuditLog } from '@/lib/auditLog';
import { getSessionTenantId, isUuid } from '@/lib/tenantContext';

/** Roles allowed to use /data-entry APIs and pages. */
const DATA_ENTRY_ROLES = new Set(['super_admin', 'college_admin']);

/**
 * @returns {Promise<{ ok: true, session: import('next-auth').Session } | { ok: false, response: Response }>}
 */
export async function requireDataEntrySession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!DATA_ENTRY_ROLES.has(session.user.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, session };
}

/**
 * College admin: always session tenant (ignores client-supplied id).
 * Super admin: optional explicit tenant UUID (e.g. query/body) when session has no tenant.
 */
export function resolveDataEntryTenantId(session, requestedTenantId) {
  const sessionTenant = getSessionTenantId(session.user);
  if (session.user.role === 'super_admin') {
    const req = requestedTenantId != null ? String(requestedTenantId).trim() : '';
    if (req && isUuid(req)) {
      void writeAuditLog({
        userId: session.user.id,
        tenantId: req,
        action: 'DATA_ENTRY_TENANT_ACCESS',
        entityType: 'tenant',
        entityId: req,
        newValues: { explicitTenantContext: true },
      });
      return req;
    }
    return sessionTenant;
  }
  return sessionTenant;
}
