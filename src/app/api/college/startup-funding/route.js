import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;

function formatInr(value) {
  return `₹${new Intl.NumberFormat('en-IN').format(Number(value || 0))}`;
}

function getTenantId(session) {
  return session?.user?.tenantId || session?.user?.tenant_id;
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });

    const tenantRes = await query(`SELECT id, name FROM tenants WHERE id = $1::uuid LIMIT 1`, [tenantId]);
    const tenant = tenantRes.rows[0];
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const oppRows = await query(
      `SELECT id, category, description, tier_name, price_inr, benefits, label
       FROM startup_funding_opportunities
       WHERE tenant_id = $1::uuid
         AND is_active = true
       ORDER BY category ASC, price_inr ASC`,
      [tenantId],
    );

    const categories = [];
    const byCategory = new Map();
    for (const row of oppRows.rows) {
      if (!byCategory.has(row.category)) {
        byCategory.set(row.category, {
          category: row.category,
          description: row.description || '',
          tiers: [],
        });
        categories.push(byCategory.get(row.category));
      }
      byCategory.get(row.category).tiers.push({
        id: row.id,
        name: row.tier_name,
        price: formatInr(row.price_inr),
        label: row.label || null,
        benefits: Array.isArray(row.benefits) ? row.benefits : [],
      });
    }

    return NextResponse.json({
      collegeName: tenant.name,
      categories,
      informationalOnly: true,
      disclaimer:
        'This catalog is published for employer discovery. Actual seed investments are negotiated and executed offline (term sheets, compliance, cap table, etc.) and are not processed through PlacementHub.',
    });
  } catch (error) {
    if (error.code === '42P01') {
      return NextResponse.json(
        { error: 'Startup funding tables missing — run db/migrations/086_startup_seed_funding.sql', dbCode: '42P01' },
        { status: 503 },
      );
    }
    console.error('GET /api/college/startup-funding', error);
    return NextResponse.json({ error: 'Failed to load startup funding programs' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_startup_funding' });
export const GET = __platformApiHandlers.GET;
