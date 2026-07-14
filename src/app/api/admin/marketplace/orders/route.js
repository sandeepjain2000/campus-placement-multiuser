import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { mapMarketplaceOrder } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const status = String(new URL(request.url).searchParams.get('status') || '').trim();
  const params = [];
  const where = [];
  if (status) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }

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
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY o.created_at DESC
     LIMIT 300`,
    params,
  );

  return NextResponse.json({ orders: result.rows.map(mapMarketplaceOrder) });
}

const handlers = withApiHandlers({ GET: __platform_GET }, { context: 'api_admin_marketplace_orders' });
export const GET = handlers.GET;
