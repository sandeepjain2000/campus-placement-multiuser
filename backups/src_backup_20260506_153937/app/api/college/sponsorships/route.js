import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

function formatInr(value) {
  return `₹${new Intl.NumberFormat('en-IN').format(Number(value || 0))}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId || session.user.tenant_id;
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const tenantRes = await query(`SELECT id, name FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
    const tenant = tenantRes.rows[0];
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const rows = await query(
      `SELECT category, description, tier_name, price_inr, benefits, label
       FROM sponsorship_opportunities
       WHERE tenant_id = $1::uuid
         AND is_active = true
       ORDER BY category ASC, price_inr ASC`,
      [tenantId]
    );

    const categories = [];
    const byCategory = new Map();
    for (const row of rows.rows) {
      if (!byCategory.has(row.category)) {
        byCategory.set(row.category, {
          category: row.category,
          description: row.description || '',
          tiers: [],
        });
        categories.push(byCategory.get(row.category));
      }
      byCategory.get(row.category).tiers.push({
        name: row.tier_name,
        price: formatInr(row.price_inr),
        label: row.label || null,
        benefits: Array.isArray(row.benefits) ? row.benefits : [],
      });
    }

    return NextResponse.json({
      collegeName: tenant.name,
      categories,
    });
  } catch (error) {
    console.error('GET /api/college/sponsorships', error);
    return NextResponse.json({ error: 'Failed to load sponsorship opportunities' }, { status: 500 });
  }
}
