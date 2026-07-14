import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveAuditScope } from '@/lib/auditScope';

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

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['super_admin', 'college_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: scopeResult.error }, { status: scopeResult.status });
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
    console.error('GET /api/audit/logs failed:', error);
    const code = error?.code;
    const message = String(error?.message || '');
    const migrationHint =
      code === '42P01' || message.includes('audit_logs')
        ? 'Apply database migration 013_audit_exports_and_assessment_uploads.sql (audit_logs table).'
        : code === '42P01' || message.includes('audit_report_exports')
          ? 'Apply database migration 013_audit_exports_and_assessment_uploads.sql.'
          : '';
    return NextResponse.json({
      logs: [],
      scope: 'platform',
      unavailable: true,
      error: migrationHint || 'Audit logs are temporarily unavailable.',
    });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_audit_logs' });
export const GET = __platformApiHandlers.GET;
