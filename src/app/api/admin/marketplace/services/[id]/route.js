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

async function __platform_PATCH(request, { params }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid service id' }, { status: 400 });

  const existing = await query(
    `SELECT s.*, p.name AS provider_name
     FROM marketplace_services s
     INNER JOIN marketplace_providers p ON p.id = s.provider_id
     WHERE s.id = $1::uuid`,
    [id],
  );
  if (!existing.rows.length) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const cur = existing.rows[0];
  const body = await request.json().catch(() => ({}));
  const validated = validateMarketplaceServiceInput({
    providerId: body.providerId ?? body.provider_id ?? cur.provider_id,
    title: body.title ?? cur.title,
    description: body.description ?? cur.description,
    priceInr: body.priceInr ?? body.price_inr ?? cur.price_inr,
    billingUnit: body.billingUnit ?? body.billing_unit ?? cur.billing_unit,
    availableToCollege: body.availableToCollege ?? body.available_to_college ?? cur.available_to_college,
    availableToEmployer:
      body.availableToEmployer ?? body.available_to_employer ?? cur.available_to_employer,
    published: body.published ?? body.is_published ?? cur.is_published,
    sortOrder: body.sortOrder ?? body.sort_order ?? cur.sort_order,
  });
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
  const updated = await query(
    `UPDATE marketplace_services
     SET provider_id = $2::uuid,
         title = $3,
         description = NULLIF($4, ''),
         price_inr = $5,
         billing_unit = $6,
         available_to_college = $7,
         available_to_employer = $8,
         is_published = $9,
         sort_order = $10,
         updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING *`,
    [
      id,
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

  const service = mapMarketplaceService({
    ...updated.rows[0],
    provider_name: provider.rows[0].name,
  });

  void writeAuditLog({
    userId: auth.session.user.id,
    action: 'UPDATE_MARKETPLACE_SERVICE',
    entityType: 'marketplace_services',
    entityId: id,
    newValues: auditNewValues(`Service updated: ${service.title}`, {
      published: service.published,
      priceInr: service.priceInr,
    }),
    ipAddress: getRequestClientIp(request),
  });

  return NextResponse.json({ service });
}

async function __platform_DELETE(request, { params }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid service id' }, { status: 400 });

  const openOrders = await query(
    `SELECT COUNT(*)::int AS n FROM marketplace_orders
     WHERE service_id = $1::uuid AND status IN ('requested', 'confirmed')`,
    [id],
  );
  if (Number(openOrders.rows[0]?.n || 0) > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a service with open purchase requests. Unpublish it instead.' },
      { status: 409 },
    );
  }

  const deleted = await query(
    `DELETE FROM marketplace_services WHERE id = $1::uuid RETURNING id, title`,
    [id],
  );
  if (!deleted.rows.length) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  void writeAuditLog({
    userId: auth.session.user.id,
    action: 'DELETE_MARKETPLACE_SERVICE',
    entityType: 'marketplace_services',
    entityId: id,
    newValues: auditNewValues(`Service deleted: ${deleted.rows[0].title}`),
    ipAddress: getRequestClientIp(request),
  });

  return NextResponse.json({ ok: true });
}

const handlers = withApiHandlers(
  { PATCH: __platform_PATCH, DELETE: __platform_DELETE },
  { context: 'api_admin_marketplace_services_id' },
);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
