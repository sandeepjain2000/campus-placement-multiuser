import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { isUuid } from '@/lib/adminAuth';
import { mapMarketplaceOrder } from '@/lib/marketplace';
import { resolveMarketplaceBuyer } from '@/lib/marketplaceBuyer';
import { auditNewValues, getRequestClientIp, writeAuditLog } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['college_admin', 'employer'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const buyer = await resolveMarketplaceBuyer(session.user);
  if (!buyer.ok) return NextResponse.json({ error: buyer.error }, { status: buyer.status });

  const result = await query(
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
     WHERE o.buyer_user_id = $1::uuid
        OR ($2::uuid IS NOT NULL AND o.tenant_id = $2::uuid)
        OR ($3::uuid IS NOT NULL AND o.employer_id = $3::uuid)
     ORDER BY o.created_at DESC
     LIMIT 200`,
    [buyer.userId, buyer.tenantId, buyer.employerId],
  );

  return NextResponse.json({ orders: result.rows.map(mapMarketplaceOrder) });
}

async function __platform_POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !['college_admin', 'employer'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const buyer = await resolveMarketplaceBuyer(session.user);
  if (!buyer.ok) return NextResponse.json({ error: buyer.error }, { status: buyer.status });

  const body = await request.json().catch(() => ({}));
  const serviceId = String(body?.serviceId || body?.service_id || '').trim();
  if (!isUuid(serviceId)) {
    return NextResponse.json({ error: 'Invalid service id' }, { status: 400 });
  }

  const quantity = Math.max(1, Number.parseInt(String(body?.quantity || 1), 10) || 1);
  const buyerNotes = String(body?.buyerNotes || body?.buyer_notes || '').trim().slice(0, 2000);

  const roleFilter =
    buyer.buyerRole === 'college_admin'
      ? 's.available_to_college = true'
      : 's.available_to_employer = true';

  const serviceRes = await query(
    `SELECT s.id, s.title, s.price_inr, s.provider_id, p.name AS provider_name
     FROM marketplace_services s
     INNER JOIN marketplace_providers p ON p.id = s.provider_id
     WHERE s.id = $1::uuid
       AND s.is_published = true
       AND p.is_active = true
       AND ${roleFilter}`,
    [serviceId],
  );
  if (!serviceRes.rows.length) {
    return NextResponse.json({ error: 'Service is not available for purchase' }, { status: 404 });
  }

  const service = serviceRes.rows[0];
  const inserted = await query(
    `INSERT INTO marketplace_orders (
       service_id, provider_id, buyer_role, tenant_id, employer_id, buyer_user_id,
       status, quantity, unit_price_inr, buyer_notes
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4::uuid, $5::uuid, $6::uuid,
       'requested', $7, $8, NULLIF($9, '')
     )
     RETURNING id`,
    [
      service.id,
      service.provider_id,
      buyer.buyerRole,
      buyer.tenantId,
      buyer.employerId,
      buyer.userId,
      quantity,
      service.price_inr,
      buyerNotes,
    ],
  );

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
    [inserted.rows[0].id],
  );

  const order = mapMarketplaceOrder(detail.rows[0]);
  void writeAuditLog({
    userId: buyer.userId,
    tenantId: buyer.tenantId,
    action: 'REQUEST_MARKETPLACE_PURCHASE',
    entityType: 'marketplace_orders',
    entityId: order.id,
    newValues: auditNewValues(`Purchase requested: ${service.title}`, {
      provider: service.provider_name,
      quantity,
      buyer: buyer.buyerOrgName,
    }),
    ipAddress: getRequestClientIp(request),
  });

  return NextResponse.json({ order }, { status: 201 });
}

const handlers = withApiHandlers(
  { GET: __platform_GET, POST: __platform_POST },
  { context: 'api_marketplace_orders' },
);
export const GET = handlers.GET;
export const POST = handlers.POST;
