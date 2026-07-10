import { withApiHandlers } from '@/lib/platformErrorRoute';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { rowsToCsv } from '@/lib/csvExport';
import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { createDownloadUrlForKey, isS3Configured, putObjectText } from '@/lib/s3';
import { resolveAuditScope } from '@/lib/auditScope';

function parseDate(value, fallback) {
  const s = String(value || '').trim();
  if (!s) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['super_admin', 'college_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isS3Configured()) {
      return NextResponse.json({ error: 'S3 is not configured' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const from = parseDate(body?.from, null);
    const to = parseDate(body?.to, null);
    const requestedTenant = String(body?.tenantId || '').trim();
    
    const commQuery = await query(`SELECT COALESCE(NULLIF(communication_email, ''), email) as email FROM users WHERE id = $1::uuid`, [session.user.id]);
    const commEmail = commQuery.rows[0]?.email || session.user.email;
    const requestedEmail = String(body?.email || commEmail || '').trim();
    if (!from || !to) {
      return NextResponse.json({ error: 'from and to dates are required (YYYY-MM-DD)' }, { status: 400 });
    }
    if (!requestedEmail) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const scopeResult = resolveAuditScope(session.user, requestedTenant);
    if (!scopeResult.ok) {
      return NextResponse.json({ error: scopeResult.error }, { status: scopeResult.status });
    }
    const tenantId = scopeResult.tenantId;

    const created = await query(
      `INSERT INTO audit_report_exports (tenant_id, requested_by, from_date, to_date, status, emailed_to)
       VALUES ($1::uuid, $2::uuid, $3::date, $4::date, 'processing', $5)
       RETURNING id`,
      [tenantId, session.user.id || null, from, to, requestedEmail],
    );
    const exportId = created.rows[0].id;

    try {
      const logs =
        scopeResult.scope === 'tenant'
          ? await query(
              `SELECT al.created_at, t.name AS tenant_name, al.action, al.entity_type, al.entity_id,
                      al.user_id, al.ip_address, al.old_values, al.new_values
               FROM audit_logs al
               LEFT JOIN tenants t ON t.id = al.tenant_id
               WHERE (al.tenant_id = $1::uuid OR (
                 al.action = 'DEMO_PURGE'
                 AND COALESCE(al.new_values->>'contextTenantId', al.new_values->>'entityTenantId') = $1::text
               ))
                 AND al.created_at >= $2::date
                 AND al.created_at < ($3::date + interval '1 day')
               ORDER BY al.created_at DESC`,
              [tenantId, from, to],
            )
          : await query(
              `SELECT al.created_at, t.name AS tenant_name, al.action, al.entity_type, al.entity_id,
                      al.user_id, al.ip_address, al.old_values, al.new_values
               FROM audit_logs al
               LEFT JOIN tenants t ON t.id = al.tenant_id
               WHERE al.created_at >= $1::date
                 AND al.created_at < ($2::date + interval '1 day')
               ORDER BY al.created_at DESC`,
              [from, to],
            );

      const headers = [
        'created_at',
        'tenant_name',
        'action',
        'entity_type',
        'entity_id',
        'user_id',
        'ip_address',
        'old_values_json',
        'new_values_json',
      ];
      const rows = logs.rows.map((r) => [
        r.created_at ? new Date(r.created_at).toISOString() : '',
        r.tenant_name || '',
        r.action || '',
        r.entity_type || '',
        r.entity_id || '',
        r.user_id || '',
        r.ip_address || '',
        r.old_values ? JSON.stringify(r.old_values) : '',
        r.new_values ? JSON.stringify(r.new_values) : '',
      ]);
      const csv = `\uFEFF${rowsToCsv(headers, rows)}`;
      const keyPrefix = tenantId ? `audit-reports/${tenantId}` : 'audit-reports/platform';
      const key = `${keyPrefix}/${from}_to_${to}/${exportId}-${randomUUID()}.csv`;
      await putObjectText({
        key,
        body: csv,
        contentType: 'text/csv; charset=utf-8',
      });
      const { downloadUrl } = await createDownloadUrlForKey(key);

      await query(
        `UPDATE audit_report_exports
         SET status = 'completed', s3_key = $1, updated_at = NOW()
         WHERE id = $2::uuid`,
        [key, exportId],
      );

      const scopeLabel =
        scopeResult.scope === 'platform' ? 'all colleges (platform-wide)' : 'the selected college';
      await sendMail({
        to: requestedEmail,
        subject: 'Campus Placement audit report is ready',
        text: `Your audit report for ${from} to ${to} (${scopeLabel}) is ready.\n\nDownload link:\n${downloadUrl}\n\nThis link is time-limited for security.`,
        context: 'audit_report_export',
        userId: session.user.id,
      });

      return NextResponse.json({
        ok: true,
        exportId,
        from,
        to,
        rows: rows.length,
      });
    } catch (innerError) {
      await query(
        `UPDATE audit_report_exports
         SET status = 'failed', error_message = $1, updated_at = NOW()
         WHERE id = $2::uuid`,
        [innerError.message || 'Export failed', exportId],
      );
      throw innerError;
    }
  } catch (error) {
    console.error('POST /api/audit/reports/export failed:', error);
    return NextResponse.json({ error: 'Failed to export audit report' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_audit_reports_export' });
export const POST = __platformApiHandlers.POST;
