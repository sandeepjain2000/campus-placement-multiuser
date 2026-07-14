import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isUuid, requireSuperAdmin } from '@/lib/adminAuth';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  mapMarketplaceProvider,
  validateMarketplaceProviderInput,
} from '@/lib/marketplace';
import { auditNewValues, getRequestClientIp, writeAuditLog } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_PATCH(request, { params }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });

  const existing = await query(`SELECT * FROM marketplace_providers WHERE id = $1::uuid`, [id]);
  if (!existing.rows.length) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const validated = validateMarketplaceProviderInput({
    ...existing.rows[0],
    name: body.name ?? existing.rows[0].name,
    category: body.category ?? existing.rows[0].category,
    tagline: body.tagline ?? existing.rows[0].tagline,
    description: body.description ?? existing.rows[0].description,
    website: body.website ?? existing.rows[0].website,
    contactEmail: body.contactEmail ?? body.contact_email ?? existing.rows[0].contact_email,
    contactPhone: body.contactPhone ?? body.contact_phone ?? existing.rows[0].contact_phone,
    logoUrl: body.logoUrl ?? body.logo_url ?? existing.rows[0].logo_url,
    active: body.active ?? body.is_active ?? existing.rows[0].is_active,
  });
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  const v = validated.value;
  const updated = await query(
    `UPDATE marketplace_providers
     SET name = $2,
         category = $3,
         tagline = NULLIF($4, ''),
         description = NULLIF($5, ''),
         website = NULLIF($6, ''),
         contact_email = NULLIF($7, ''),
         contact_phone = NULLIF($8, ''),
         logo_url = NULLIF($9, ''),
         is_active = $10,
         updated_at = NOW()
     WHERE id = $1::uuid
     RETURNING *`,
    [
      id,
      v.name,
      v.category,
      v.tagline,
      v.description,
      v.website,
      v.contactEmail,
      v.contactPhone,
      v.logoUrl,
      v.active,
    ],
  );

  const provider = mapMarketplaceProvider(updated.rows[0]);
  void writeAuditLog({
    userId: auth.session.user.id,
    action: 'UPDATE_MARKETPLACE_PROVIDER',
    entityType: 'marketplace_providers',
    entityId: id,
    newValues: auditNewValues(`Provider updated: ${provider.name}`, {
      name: provider.name,
      active: provider.active,
    }),
    ipAddress: getRequestClientIp(request),
  });

  return NextResponse.json({ provider });
}

async function __platform_DELETE(request, { params }) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });

  const openOrders = await query(
    `SELECT COUNT(*)::int AS n FROM marketplace_orders
     WHERE provider_id = $1::uuid AND status IN ('requested', 'confirmed')`,
    [id],
  );
  if (Number(openOrders.rows[0]?.n || 0) > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a provider with open purchase requests. Deactivate it instead.' },
      { status: 409 },
    );
  }

  const deleted = await query(
    `DELETE FROM marketplace_providers WHERE id = $1::uuid RETURNING id, name`,
    [id],
  );
  if (!deleted.rows.length) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  void writeAuditLog({
    userId: auth.session.user.id,
    action: 'DELETE_MARKETPLACE_PROVIDER',
    entityType: 'marketplace_providers',
    entityId: id,
    newValues: auditNewValues(`Provider deleted: ${deleted.rows[0].name}`),
    ipAddress: getRequestClientIp(request),
  });

  return NextResponse.json({ ok: true });
}

const handlers = withApiHandlers(
  { PATCH: __platform_PATCH, DELETE: __platform_DELETE },
  { context: 'api_admin_marketplace_providers_id' },
);
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
