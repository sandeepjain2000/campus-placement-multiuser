import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import {
  mapMarketplaceProvider,
  validateMarketplaceProviderInput,
} from '@/lib/marketplace';
import { auditNewValues, getRequestClientIp, writeAuditLog } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const result = await query(
    `SELECT
       p.*,
       (SELECT COUNT(*)::int FROM marketplace_services s WHERE s.provider_id = p.id) AS service_count
     FROM marketplace_providers p
     ORDER BY p.name ASC`,
  );

  return NextResponse.json({
    providers: result.rows.map(mapMarketplaceProvider),
  });
}

async function __platform_POST(request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const validated = validateMarketplaceProviderInput(body);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

  const v = validated.value;
  const inserted = await query(
    `INSERT INTO marketplace_providers (
       name, category, tagline, description, website, contact_email, contact_phone, logo_url, is_active, created_by
     ) VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), $9, $10::uuid)
     RETURNING *`,
    [
      v.name,
      v.category,
      v.tagline,
      v.description,
      v.website,
      v.contactEmail,
      v.contactPhone,
      v.logoUrl,
      v.active,
      auth.session.user.id,
    ],
  );

  const provider = mapMarketplaceProvider(inserted.rows[0]);
  void writeAuditLog({
    userId: auth.session.user.id,
    action: 'CREATE_MARKETPLACE_PROVIDER',
    entityType: 'marketplace_providers',
    entityId: provider.id,
    newValues: auditNewValues(`Provider added: ${provider.name}`, {
      name: provider.name,
      category: provider.category,
    }),
    ipAddress: getRequestClientIp(request),
  });

  return NextResponse.json({ provider }, { status: 201 });
}

const handlers = withApiHandlers(
  { GET: __platform_GET, POST: __platform_POST },
  { context: 'api_admin_marketplace_providers' },
);
export const GET = handlers.GET;
export const POST = handlers.POST;
