import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isUuid, requireSuperAdmin } from '@/lib/adminAuth';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { MARKETPLACE_ORDER_STATUSES, mapMarketplaceOrder } from '@/lib/marketplace';
import { auditNewValues, getRequestClientIp, writeAuditLog } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_PATCH(request, { params }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const status = String(body?.status || '').trim();
  if (!MARKETPLACE_ORDER_STATUSES.some((s) => s.value === status)) {
    return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
  }
  const adminNotes = String(body?.adminNotes || body?.admin_notes || '').trim();

  const updated = await query(
    `UPDATE marketplace_orders
     SET status = $2,
         admin_notes = CASE WHEN $3 = '' THEN admin_notes ELSE $3 END,
         updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING *`,
    [id, status, adminNotes],
  );
  if (!updated.rows.length) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const detail = await query(
    `SELECT
       o.*,
       s.title AS service_title,
       p.name AS provider_name,
       u.email AS buyer_email,
       COALESCE(t.name, ep.company_name) AS buyer_org_name
     FROM marketplace_orders o
     INNER JOIN marketplace_services s ON s.id = o.service_id
     INNER JOIN marketplace_providers p ON p.id = o.provider_id
     INNER JOIN users u ON u.id = o.buyer_user_id
     LEFT JOIN tenants t ON t.id = o.tenant_id
     LEFT JOIN employer_profiles ep ON ep.id = o.employer_id
     WHERE o.id = $1::uuid`,
    [id],
  );

  const order = mapMarketplaceOrder(detail.rows[0]);
  void writeAuditLog({
    userId: auth.session.user.id,
    tenantId: order.tenantId,
    action: 'UPDATE_MARKETPLACE_ORDER',
    entityType: 'marketplace_orders',
    entityId: id,
    newValues: auditNewValues(`Order ${status}: ${order.serviceTitle}`, {
      status,
      buyer: order.buyerOrgName,
    }),
    ipAddress: getRequestClientIp(request),
  });

  return NextResponse.json({ order });
}

const handlers = withApiHandlers(
  { PATCH: __platform_PATCH },
  { context: 'api_admin_marketplace_orders_id' },
);
export const PATCH = handlers.PATCH;
