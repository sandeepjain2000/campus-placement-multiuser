import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

function formatInr(value) {
  return new Intl.NumberFormat('en-IN').format(value);
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collegesRes = await query(
      `SELECT id, name, city, settings
       FROM tenants
       WHERE type = 'college'
       ORDER BY name ASC`,
    );

    const fundingRes = await query(
      `SELECT
        sfo.id,
        sfo.tenant_id,
        sfo.category,
        sfo.description,
        sfo.tier_name,
        sfo.price_inr,
        sfo.benefits,
        sfo.label
       FROM startup_funding_opportunities sfo
       WHERE sfo.is_active = true
       ORDER BY sfo.tenant_id, sfo.category, sfo.price_inr ASC`,
    );

    const opportunitiesByTenant = new Map();
    for (const row of fundingRes.rows) {
      const tenantMap = opportunitiesByTenant.get(row.tenant_id) || new Map();
      if (!tenantMap.has(row.category)) {
        tenantMap.set(row.category, {
          category: row.category,
          description: row.description || '',
          tiers: [],
        });
      }
      tenantMap.get(row.category).tiers.push({
        id: row.id,
        name: row.tier_name,
        price: `₹${formatInr(Number(row.price_inr || 0))}`,
        priceInr: Number(row.price_inr || 0),
        priceNote: 'Indicative range — final terms negotiated offline',
        benefits: Array.isArray(row.benefits) ? row.benefits : [],
        label: row.label || null,
      });
      opportunitiesByTenant.set(row.tenant_id, tenantMap);
    }

    const colleges = collegesRes.rows.map((college) => {
      const settings = college.settings && typeof college.settings === 'object' ? college.settings : {};
      const contactEmail = String(settings?.placementOfficer?.email || '').trim() || null;
      return {
        id: college.id,
        name: college.name,
        location: college.city || 'India',
        contactEmail,
        fundingLevels: opportunitiesByTenant.has(college.id)
          ? Array.from(opportunitiesByTenant.get(college.id).values())
          : [],
      };
    });

    return NextResponse.json({
      colleges,
      informationalOnly: true,
      disclaimer:
        'Programs shown here are for discovery only. Seed investments involve separate legal, diligence, and term-sheet processes outside PlacementHub.',
    });
  } catch (error) {
    if (error.code === '42P01') {
      return NextResponse.json(
        { error: 'Startup funding tables missing — run db/migrations/086_startup_seed_funding.sql', dbCode: '42P01' },
        { status: 503 },
      );
    }
    console.error('Failed to load startup funding options:', error);
    return NextResponse.json({ error: 'Failed to load startup funding options' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_startup_funding' });
export const GET = __platformApiHandlers.GET;
