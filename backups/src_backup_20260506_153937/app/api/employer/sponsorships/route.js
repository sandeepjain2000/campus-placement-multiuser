import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

function formatInr(value) {
  return new Intl.NumberFormat('en-IN').format(value);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collegesRes = await query(
      `SELECT id, name, city
       FROM tenants
       WHERE type = 'college'
       ORDER BY name ASC`
    );

    const sponsorshipRes = await query(
      `SELECT
        so.tenant_id,
        so.category,
        so.description,
        so.tier_name,
        so.price_inr,
        so.benefits,
        so.label
       FROM sponsorship_opportunities so
       WHERE so.is_active = true
       ORDER BY so.tenant_id, so.category, so.price_inr ASC`
    );

    const opportunitiesByTenant = new Map();
    for (const row of sponsorshipRes.rows) {
      const tenantMap = opportunitiesByTenant.get(row.tenant_id) || new Map();
      if (!tenantMap.has(row.category)) {
        tenantMap.set(row.category, {
          category: row.category,
          description: row.description || '',
          tiers: [],
        });
      }
      tenantMap.get(row.category).tiers.push({
        name: row.tier_name,
        price: `₹${formatInr(Number(row.price_inr || 0))}`,
        benefits: Array.isArray(row.benefits) ? row.benefits : [],
        label: row.label || null,
      });
      opportunitiesByTenant.set(row.tenant_id, tenantMap);
    }

    const colleges = collegesRes.rows.map((college) => ({
      id: college.id,
      name: college.name,
      location: college.city || 'India',
      sponsorshipLevels: opportunitiesByTenant.has(college.id)
        ? Array.from(opportunitiesByTenant.get(college.id).values())
        : [],
    }));

    return NextResponse.json({
      colleges,
      paymentInfo: {
        accountName: null,
        bankName: null,
        accountNumberMasked: null,
        ifsc: null,
        branch: null,
      },
    });
  } catch (error) {
    console.error('Failed to load sponsorship options:', error);
    return NextResponse.json({ error: 'Failed to load sponsorship options' }, { status: 500 });
  }
}
