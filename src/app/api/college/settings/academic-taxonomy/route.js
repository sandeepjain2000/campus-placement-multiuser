import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { loadAcademicTaxonomyTree } from '@/lib/academicTaxonomy/queries';
import {
  getTaxonomyFromTenantSettings,
  mergeTaxonomySettingsForSave,
  parseCollegeTaxonomySettings,
} from '@/lib/academicTaxonomy/tenantSettings';
import { withApiHandlers } from '@/lib/platformErrorRoute';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getTenantId(session) {
  return session?.user?.tenant_id ?? session?.user?.tenantId ?? null;
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const t = await query(`SELECT settings FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
    const taxonomySettings = getTaxonomyFromTenantSettings(t.rows[0]?.settings);
    const tree = await loadAcademicTaxonomyTree({ taxonomySettings });

    return NextResponse.json({
      settings: taxonomySettings,
      ...tree,
    });
  } catch (error) {
    console.error('GET /api/college/settings/academic-taxonomy', error);
    return NextResponse.json({ error: 'Failed to load academic taxonomy settings' }, { status: 500 });
  }
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const body = await request.json();
    const parsed = parseCollegeTaxonomySettings(body);
    const toSave = mergeTaxonomySettingsForSave(parsed);

    const existing = await query(`SELECT settings FROM tenants WHERE id = $1::uuid`, [tenantId]);
    const settings = existing.rows[0]?.settings || {};
    const merged = {
      ...settings,
      academicTaxonomy: toSave,
    };

    await query(
      `UPDATE tenants SET settings = $1::jsonb, updated_at = NOW() WHERE id = $2::uuid`,
      [JSON.stringify(merged), tenantId],
    );

    return NextResponse.json({
      success: true,
      settings: parsed,
      message: 'Academic taxonomy settings saved.',
    });
  } catch (error) {
    console.error('POST /api/college/settings/academic-taxonomy', error);
    return NextResponse.json({ error: 'Failed to save academic taxonomy settings' }, { status: 500 });
  }
}

const handlers = withApiHandlers(
  { GET: __platform_GET, POST: __platform_POST },
  { context: 'api_college_settings_academic_taxonomy' },
);
export const GET = handlers.GET;
export const POST = handlers.POST;
