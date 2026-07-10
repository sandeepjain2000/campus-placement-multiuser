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

function maskAccountNumber(raw) {
  const s = String(raw || '').replace(/\s/g, '');
  if (s.length <= 4) return s || '—';
  return `****${s.slice(-4)}`;
}

async function __platform_GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const epRes = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [session.user.id]);
    const employerProfileId = epRes.rows[0]?.id || null;

    const collegesRes = await query(
      `SELECT id, name, city
       FROM tenants
       WHERE type = 'college'
       ORDER BY name ASC`,
    );

    const sponsorshipRes = await query(
      `SELECT
        so.id,
        so.tenant_id,
        so.category,
        so.description,
        so.tier_name,
        so.price_inr,
        so.benefits,
        so.label
       FROM sponsorship_opportunities so
       WHERE so.is_active = true
       ORDER BY so.tenant_id, so.category, so.price_inr ASC`,
    );

    let paymentCountByOpp = new Map();
    if (employerProfileId) {
      const cnt = await query(
        `SELECT opportunity_id, COUNT(*)::int AS n
         FROM sponsorship_payments
         WHERE employer_profile_id = $1::uuid
         GROUP BY opportunity_id`,
        [employerProfileId],
      );
      paymentCountByOpp = new Map(cnt.rows.map((r) => [r.opportunity_id, r.n]));
    }

    const tenantIds = [...new Set(collegesRes.rows.map((c) => c.id))];
    const settingsRes = tenantIds.length
      ? await query(
          `SELECT tenant_id,
            sponsorship_cheque_payable_to,
            sponsorship_bank_account_name,
            sponsorship_bank_name,
            sponsorship_bank_account_number,
            sponsorship_bank_ifsc,
            sponsorship_bank_branch
           FROM college_settings
           WHERE tenant_id = ANY($1::uuid[])`,
          [tenantIds],
        )
      : { rows: [] };

    const settingsByTenant = new Map(settingsRes.rows.map((r) => [r.tenant_id, r]));

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
      const made = paymentCountByOpp.get(row.id) || 0;
      tenantMap.get(row.category).tiers.push({
        id: row.id,
        name: row.tier_name,
        price: `₹${formatInr(Number(row.price_inr || 0))}`,
        priceInr: Number(row.price_inr || 0),
        benefits: Array.isArray(row.benefits) ? row.benefits : [],
        label: row.label || null,
        paymentsRecorded: made,
        canPayAnother: made === 0,
      });
      opportunitiesByTenant.set(row.tenant_id, tenantMap);
    }

    const colleges = collegesRes.rows.map((college) => {
      const st = settingsByTenant.get(college.id);
      const acct = st?.sponsorship_bank_account_number;
      return {
        id: college.id,
        name: college.name,
        location: college.city || 'India',
        sponsorshipLevels: opportunitiesByTenant.has(college.id)
          ? Array.from(opportunitiesByTenant.get(college.id).values())
          : [],
        remittance: {
          chequePayableTo: st?.sponsorship_cheque_payable_to || null,
          accountName: st?.sponsorship_bank_account_name || null,
          bankName: st?.sponsorship_bank_name || null,
          accountNumber: acct || null,
          accountNumberMasked: acct ? maskAccountNumber(acct) : null,
          ifsc: st?.sponsorship_bank_ifsc || null,
          branch: st?.sponsorship_bank_branch || null,
        },
      };
    });

    return NextResponse.json({ colleges, employerProfileId });
  } catch (error) {
    console.error('Failed to load sponsorship options:', error);
    return NextResponse.json({ error: 'Failed to load sponsorship options' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_employer_sponsorships' });
export const GET = __platformApiHandlers.GET;
