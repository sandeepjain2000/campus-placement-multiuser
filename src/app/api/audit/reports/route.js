import { withApiHandlers } from '@/lib/platformErrorRoute';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { resolveAuditScope } from '@/lib/auditScope';

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['super_admin', 'college_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const requestedTenant = String(url.searchParams.get('tenantId') || '').trim();
    const scopeResult = resolveAuditScope(session.user, requestedTenant);
    if (!scopeResult.ok) {
      return NextResponse.json({ error: scopeResult.error }, { status: scopeResult.status });
    }

    const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '30', 10)));
    const res =
      scopeResult.scope === 'tenant'
        ? await query(
            `SELECT e.id, e.tenant_id, t.name AS tenant_name, e.requested_by, e.from_date, e.to_date,
                    e.status, e.s3_key, e.emailed_to, e.error_message, e.created_at, e.updated_at
             FROM audit_report_exports e
             LEFT JOIN tenants t ON t.id = e.tenant_id
             WHERE e.tenant_id = $1::uuid
             ORDER BY e.created_at DESC
             LIMIT $2`,
            [scopeResult.tenantId, limit],
          )
        : await query(
            `SELECT e.id, e.tenant_id, t.name AS tenant_name, e.requested_by, e.from_date, e.to_date,
                    e.status, e.s3_key, e.emailed_to, e.error_message, e.created_at, e.updated_at
             FROM audit_report_exports e
             LEFT JOIN tenants t ON t.id = e.tenant_id
             ORDER BY e.created_at DESC
             LIMIT $1`,
            [limit],
          );
    return NextResponse.json({ exports: res.rows, scope: scopeResult.scope });
  } catch (error) {
    console.error('GET /api/audit/reports failed:', error);
    return NextResponse.json({ exports: [], scope: 'platform', unavailable: true });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_audit_reports' });
export const GET = __platformApiHandlers.GET;
