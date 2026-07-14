import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { withApiHandlers } from '@/lib/platformErrorRoute';
import { mapMarketplaceService } from '@/lib/marketplace';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user || !['college_admin', 'employer'].includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const roleFilter =
    role === 'college_admin'
      ? 's.available_to_college = true'
      : 's.available_to_employer = true';

  const result = await query(
    `SELECT
       s.*,
       p.name AS provider_name,
       p.category AS provider_category,
       p.is_active AS provider_active,
       p.tagline AS provider_tagline,
       p.website AS provider_website
     FROM marketplace_services s
     INNER JOIN marketplace_providers p ON p.id = s.provider_id
     WHERE s.is_published = true
       AND p.is_active = true
       AND ${roleFilter}
     ORDER BY p.category ASC, p.name ASC, s.sort_order ASC, s.title ASC`,
  );

  const services = result.rows.map((row) => ({
    ...mapMarketplaceService(row),
    providerTagline: row.provider_tagline || '',
    providerWebsite: row.provider_website || '',
  }));

  return NextResponse.json({ services, buyerRole: role });
}

const handlers = withApiHandlers({ GET: __platform_GET }, { context: 'api_marketplace_catalog' });
export const GET = handlers.GET;
