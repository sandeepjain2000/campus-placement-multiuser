import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSessionTenantId, isUuid } from '@/lib/tenantContext';

function parseDate(value, fallback) {
  const s = String(value || '').trim();
  if (!s) return fallback;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

export async function GET(request) {
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
    const sessionTenant = getSessionTenantId(session.user);

    let tenantId = sessionTenant;
    if (session.user.role === 'super_admin' && requestedTenant && isUuid(requestedTenant)) {
      tenantId = requestedTenant;
    }
    if (!tenantId || !isUuid(String(tenantId))) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const params = [tenantId, from, to];
    const where = ['tenant_id = $1::uuid', 'DATE(created_at) >= $2::date', 'DATE(created_at) <= $3::date'];
    if (action) {
      params.push(action);
      where.push(`action = $${params.length}`);
    }
    if (entityType) {
      params.push(entityType);
      where.push(`entity_type = $${params.length}`);
    }
    params.push(limit);

    const res = await query(
      `SELECT id, user_id, tenant_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at
       FROM audit_logs
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params,
    );

    return NextResponse.json({ logs: res.rows });
  } catch (error) {
    console.error('GET /api/audit/logs failed:', error);
    return NextResponse.json({ error: 'Failed to load audit logs' }, { status: 500 });
  }
}
