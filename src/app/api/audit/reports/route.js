import { withApiHandlers } from '@/lib/platformErrorRoute';
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

const AUDIT_REPORTS_UNAVAILABLE =
  'Audit export history could not be loaded right now. Please try again.';

async function __platform_GET(request) {
  const session = await getServerSession(authOptions);
  try {
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
    // Soft HTTP 200 — persist explicitly so the log keeps the original exception/stack.
    const systemCode = AUDIT_SYSTEM_ERROR_CODES.EXPORT_UNAVAILABLE;
    const referenceId = await writePlatformErrorLog({
      context: PLATFORM_ERROR_CONTEXT.AUDIT_REPORTS,
      error,
      errorCode: systemCode,
      statusCode: 500,
      severity: 'error',
      userId: session?.user?.id || session?.user?.sub || null,
      userMessage: AUDIT_REPORTS_UNAVAILABLE,
      ipAddress: getRequestIp(request),
      details: {
        source: 'audit_soft_failure',
        route: '/api/audit/reports',
        unavailable: true,
        pgCode: error?.code || null,
        systemErrorCode: systemCode,
        actorEmail: session?.user?.email || null,
      },
    });
    const ref = formatErrorReference(referenceId);
    return NextResponse.json({
      exports: [],
      scope: 'platform',
      unavailable: true,
      error: appendErrorReference(AUDIT_REPORTS_UNAVAILABLE, { reference: ref, referenceId }),
      errorCode: systemCode,
      ...(ref
        ? { referenceId, reference: ref }
        : {}),
    });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: PLATFORM_ERROR_CONTEXT.AUDIT_REPORTS });
export const GET = __platformApiHandlers.GET;
