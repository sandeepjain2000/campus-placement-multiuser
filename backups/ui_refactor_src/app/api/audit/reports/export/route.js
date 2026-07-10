import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { rowsToCsv } from '@/lib/csvExport';
import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { createDownloadUrlForKey, isS3Configured, putObjectText } from '@/lib/s3';
import { getSessionTenantId, isUuid } from '@/lib/tenantContext';

function parseDate(value, fallback) {
  const s = String(value || '').trim();
  if (!s) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

export async function POST(request) {
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
    const requestedEmail = String(body?.email || session.user.email || '').trim();
    if (!from || !to) {
      return NextResponse.json({ error: 'from and to dates are required (YYYY-MM-DD)' }, { status: 400 });
    }
    if (!requestedEmail) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const sessionTenant = getSessionTenantId(session.user);
    let tenantId = sessionTenant;
    if (session.user.role === 'super_admin' && requestedTenant && isUuid(requestedTenant)) {
      tenantId = requestedTenant;
    }
    if (!tenantId || !isUuid(String(tenantId))) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const created = await query(
      `INSERT INTO audit_report_exports (tenant_id, requested_by, from_date, to_date, status, emailed_to)
       VALUES ($1::uuid, $2::uuid, $3::date, $4::date, 'processing', $5)
       RETURNING id`,
      [tenantId, session.user.id || null, from, to, requestedEmail],
    );
    const exportId = created.rows[0].id;

    try {
      const logs = await query(
        `SELECT created_at, action, entity_type, entity_id, user_id, ip_address, old_values, new_values
         FROM audit_logs
         WHERE tenant_id = $1::uuid
           AND DATE(created_at) >= $2::date
           AND DATE(created_at) <= $3::date
         ORDER BY created_at DESC`,
        [tenantId, from, to],
      );

      const headers = [
        'created_at',
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
        r.action || '',
        r.entity_type || '',
        r.entity_id || '',
        r.user_id || '',
        r.ip_address || '',
        r.old_values ? JSON.stringify(r.old_values) : '',
        r.new_values ? JSON.stringify(r.new_values) : '',
      ]);
      const csv = `\uFEFF${rowsToCsv(headers, rows)}`;
      const key = `audit-reports/${tenantId}/${from}_to_${to}/${exportId}-${randomUUID()}.csv`;
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

      await sendMail({
        to: requestedEmail,
        subject: 'Campus Placement audit report is ready',
        text: `Your audit report for ${from} to ${to} is ready.\n\nDownload link:\n${downloadUrl}\n\nThis link is time-limited for security.`,
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
