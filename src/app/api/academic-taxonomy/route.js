import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { loadAcademicTaxonomyTree } from '@/lib/academicTaxonomy/queries';
import {
  getTaxonomyFromTenantSettings,
  parseCollegeTaxonomySettings,
} from '@/lib/academicTaxonomy/tenantSettings';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function __platform_GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(request.url);
    const tenantIdParam = url.searchParams.get('tenantId')?.trim();

    let taxonomySettings = parseCollegeTaxonomySettings({});

    if (session?.user?.role === 'college_admin') {
      const tenantId = session.user.tenant_id ?? session.user.tenantId;
      if (tenantId) {
        const t = await query(`SELECT settings FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
        taxonomySettings = getTaxonomyFromTenantSettings(t.rows[0]?.settings);
      }
    } else if (tenantIdParam && session?.user?.role === 'super_admin') {
      const t = await query(`SELECT settings FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantIdParam]);
      taxonomySettings = getTaxonomyFromTenantSettings(t.rows[0]?.settings);
    }

    const tree = await loadAcademicTaxonomyTree({ taxonomySettings });
    return NextResponse.json(tree);
  } catch (error) {
    if (error?.code === '42P01') {
      return NextResponse.json(
        { error: 'Academic taxonomy tables missing. Run npm run db:migrate:096 && npm run seed:academic-taxonomy.' },
        { status: 503 },
      );
    }
    console.error('GET /api/academic-taxonomy', error);
    return NextResponse.json({ error: 'Failed to load academic taxonomy' }, { status: 500 });
  }
}

const handlers = withApiHandlers({ GET: __platform_GET }, { context: 'api_academic_taxonomy' });
export const GET = handlers.GET;
