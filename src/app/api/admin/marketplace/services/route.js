import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isUuid, requireSuperAdmin } from '@/lib/adminAuth';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  mapMarketplaceService,
  validateMarketplaceServiceInput,
} from '@/lib/marketplace';
import { auditNewValues, getRequestClientIp, writeAuditLog } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const providerId = new URL(request.url).searchParams.get('providerId');
  const params = [];
  const where = [];
  if (providerId) {
    if (!isUuid(providerId)) {
      return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });
    }
    params.push(providerId);
    where.push(`s.provider_id = $${params.length}::uuid`);
  }

  const result = await query(
    `SELECT s.*, p.name AS provider_name, p.category AS provider_category, p.is_active AS provider_active
     FROM marketplace_services s
     INNER JOIN marketplace_providers p ON p.id = s.provider_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.name ASC, s.sort_order ASC, s.title ASC`,
    params,
  );

  return NextResponse.json({ services: result.rows.map(mapMarketplaceService) });
}

async function __platform_POST(request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const validated = validateMarketplaceServiceInput(body);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });
  if (!isUuid(validated.value.providerId)) {
    return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });
  }

  const provider = await query(`SELECT id, name FROM marketplace_providers WHERE id = $1::uuid`, [
    validated.value.providerId,
  ]);
  if (!provider.rows.length) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  const v = validated.value;
  const inserted = await query(
    `INSERT INTO marketplace_services (
       provider_id, title, description, price_inr, billing_unit,
       available_to_college, available_to_employer, is_published, sort_order
     ) VALUES ($1::uuid, $2, NULLIF($3, ''), $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      v.providerId,
      v.title,
      v.description,
      v.priceInr,
      v.billingUnit,
      v.availableToCollege,
      v.availableToEmployer,
      v.published,
      v.sortOrder,
    ],
  );

  const row = {
    ...inserted.rows[0],
    provider_name: provider.rows[0].name,
  };
  const service = mapMarketplaceService(row);
  void writeAuditLog({
    userId: auth.session.user.id,
    action: 'CREATE_MARKETPLACE_SERVICE',
    entityType: 'marketplace_services',
    entityId: service.id,
    newValues: auditNewValues(`Service added: ${service.title}`, {
      provider: provider.rows[0].name,
      priceInr: service.priceInr,
    }),
    ipAddress: getRequestClientIp(request),
  });

  return NextResponse.json({ service }, { status: 201 });
}

const handlers = withApiHandlers(
  { GET: __platform_GET, POST: __platform_POST },
  { context: 'api_admin_marketplace_services' },
);
export const GET = handlers.GET;
export const POST = handlers.POST;
