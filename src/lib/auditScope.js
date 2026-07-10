import { getSessionTenantId, isUuid } from '@/lib/tenantContext';

/**
 * Resolves tenant scope for audit log read/export APIs.
 * Super admins may omit tenantId for platform-wide (all colleges) access.
 */
export function resolveAuditScope(user, requestedTenantId) {
  if (!user) {
    return { ok: false, error: 'Unauthorized', status: 401 };
  }

  const requested = String(requestedTenantId || '').trim();

  if (user.role === 'college_admin') {
    const tenantId = getSessionTenantId(user);
    if (!tenantId || !isUuid(tenantId)) {
      return { ok: false, error: 'Tenant context missing', status: 400 };
    }
    return { ok: true, scope: 'tenant', tenantId };
  }

  if (user.role === 'super_admin') {
    if (requested && isUuid(requested)) {
      return { ok: true, scope: 'tenant', tenantId: requested };
    }
    return { ok: true, scope: 'platform', tenantId: null };
  }

  return { ok: false, error: 'Unauthorized', status: 401 };
}
