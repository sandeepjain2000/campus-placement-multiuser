import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSessionTenantId, isUuid } from '@/lib/tenantContext';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['super_admin', 'college_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const requestedTenant = String(url.searchParams.get('tenantId') || '').trim();
    const sessionTenant = getSessionTenantId(session.user);
    let tenantId = sessionTenant;
    if (session.user.role === 'super_admin' && requestedTenant && isUuid(requestedTenant)) {
      tenantId = requestedTenant;
    }
    if (!tenantId || !isUuid(String(tenantId))) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '30', 10)));
    const res = await query(
      `SELECT id, tenant_id, requested_by, from_date, to_date, status, s3_key, emailed_to, error_message, created_at, updated_at
       FROM audit_report_exports
       WHERE tenant_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, limit],
    );
    return NextResponse.json({ exports: res.rows });
  } catch (error) {
    console.error('GET /api/audit/reports failed:', error);
    return NextResponse.json({ error: 'Failed to load audit report exports' }, { status: 500 });
  }
}
