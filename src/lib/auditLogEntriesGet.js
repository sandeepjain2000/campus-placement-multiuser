import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveAuditScope } from '@/lib/auditScope';
import {
  formatErrorReference,
  getRequestIp,
  writePlatformErrorLog,
} from '@/lib/platformErrorLog';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import { appendErrorReference } from '@/lib/errorReference';
import { AUDIT_SYSTEM_ERROR_CODES } from '@/lib/auditSystemErrorCodes';

/** Predefined user-facing messages — no stack traces or SQL details. */
export const AUDIT_LOG_ERRORS = Object.freeze({
  UNAUTHORIZED: 'You do not have permission to view audit logs.',
  TENANT_MISSING: 'College context is missing. Sign in again or contact support.',
  UNAVAILABLE: 'Audit log entries could not be loaded right now. Please try again.',
  MIGRATION_REQUIRED:
    'Audit log storage is not available on this environment. Ask your administrator to finish setup.',
});

function parseDate(value, fallback) {
  const s = String(value || '').trim();
  if (!s) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

/** Human-readable summary for audit log table search/display. */
function formatAuditDetails(row) {
  const nv = row?.new_values;
  if (!nv || typeof nv !== 'object') return null;
  if (row.action === 'DEMO_PURGE') {
    const parts = [nv.label].filter(Boolean);
    if (nv.cascade && typeof nv.cascade === 'object') {
      const hits = Object.entries(nv.cascade).filter(([, v]) => Number(v) > 0);
      if (hits.length) {
        parts.push(hits.map(([k, v]) => `${k}:${v}`).join(', '));
      }
    }
    return parts.join(' · ') || null;
  }
  if (typeof nv.summary === 'string' && nv.summary.trim()) return nv.summary.trim();
  const fallback = [nv.name, nv.email, nv.label, nv.adminEmail].filter(Boolean);
  return fallback.length ? fallback.join(' · ') : null;
}

/**
 * GET handler for audit log entries (shared by /api/audit/log-entries).
 * Soft-fails with HTTP 200 + unavailable so the UI can show a friendly empty state,
 * while still writing platform_error_logs with the original exception/stack.
 */
export async function getAuditLogEntries(request) {
  const session = await getServerSession(authOptions);
  try {
    if (!session?.user || !['super_admin', 'college_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: AUDIT_LOG_ERRORS.UNAUTHORIZED }, { status: 401 });
    }

    const url = new URL(request.url);
    const from = parseDate(url.searchParams.get('from'), '1970-01-01');
    const to = parseDate(url.searchParams.get('to'), '2999-12-31');
    const action = String(url.searchParams.get('action') || '').trim();
    const entityType = String(url.searchParams.get('entityType') || '').trim();
    const limit = Math.min(1000, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '300', 10)));
    const requestedTenant = String(url.searchParams.get('tenantId') || '').trim();
    const scopeResult = resolveAuditScope(session.user, requestedTenant);
    if (!scopeResult.ok) {
      const status = scopeResult.status || 400;
      const error =
        status === 401
          ? AUDIT_LOG_ERRORS.UNAUTHORIZED
          : status === 400
            ? AUDIT_LOG_ERRORS.TENANT_MISSING
            : AUDIT_LOG_ERRORS.UNAVAILABLE;
      return NextResponse.json({ error }, { status });
    }

    const params = scopeResult.scope === 'tenant' ? [scopeResult.tenantId, from, to] : [from, to];
    const where =
      scopeResult.scope === 'tenant'
        ? [
            `(al.tenant_id = $1::uuid OR (
              al.action = 'DEMO_PURGE'
              AND COALESCE(al.new_values->>'contextTenantId', al.new_values->>'entityTenantId') = $1::text
            ))`,
            `al.created_at >= $2::date`,
            `al.created_at < ($3::date + interval '1 day')`,
          ]
        : [
            `al.created_at >= $1::date`,
            `al.created_at < ($2::date + interval '1 day')`,
          ];
    if (action) {
      params.push(action);
      where.push(`al.action = $${params.length}`);
    }
    if (entityType) {
      params.push(entityType);
      where.push(`al.entity_type = $${params.length}`);
    }
    params.push(limit);

    const res = await query(
      `SELECT al.id, al.user_id, al.tenant_id, t.name AS tenant_name,
              al.action, al.entity_type, al.entity_id, al.old_values, al.new_values, al.ip_address, al.created_at,
              u.email AS actor_email,
              NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), '') AS actor_name
       FROM audit_logs al
       LEFT JOIN tenants t ON t.id = al.tenant_id
       LEFT JOIN users u ON u.id = al.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY al.created_at DESC
       LIMIT $${params.length}`,
      params,
    );

    const logs = res.rows.map((row) => ({
      ...row,
      details: formatAuditDetails(row),
    }));

    return NextResponse.json({ logs, scope: scopeResult.scope });
  } catch (error) {
    console.error('GET audit log entries failed:', error);
    const code = error?.code;
    const message = String(error?.message || '');
    const needsMigration =
      code === '42P01' || /audit_logs|audit_report_exports/i.test(message);
    const userMessage = needsMigration
      ? AUDIT_LOG_ERRORS.MIGRATION_REQUIRED
      : AUDIT_LOG_ERRORS.UNAVAILABLE;
    const systemCode = needsMigration
      ? AUDIT_SYSTEM_ERROR_CODES.MIGRATION
      : AUDIT_SYSTEM_ERROR_CODES.UNAVAILABLE;
    const referenceId = await writePlatformErrorLog({
      context: PLATFORM_ERROR_CONTEXT.AUDIT_LOG_ENTRIES,
      error,
      errorCode: systemCode,
      statusCode: needsMigration ? 503 : 500,
      severity: 'error',
      userId: session?.user?.id || session?.user?.sub || null,
      userMessage,
      ipAddress: getRequestIp(request),
      details: {
        source: 'audit_soft_failure',
        route: '/api/audit/log-entries',
        unavailable: true,
        needsMigration: Boolean(needsMigration),
        pgCode: code || null,
        systemErrorCode: systemCode,
        actorEmail: session?.user?.email || null,
      },
    });
    const ref = formatErrorReference(referenceId);
    const errorWithRef = appendErrorReference(userMessage, { reference: ref, referenceId });
    return NextResponse.json(
      {
        logs: [],
        scope: 'platform',
        unavailable: true,
        error: errorWithRef,
        errorCode: systemCode,
        ...(ref ? { referenceId, reference: ref } : {}),
      },
      { status: 200 },
    );
  }
}
