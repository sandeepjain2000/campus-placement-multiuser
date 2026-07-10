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
       FROM sponsorship_opportunities
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

    let payments = { rows: [] };
    let receiptJoin = true;
    try {
      payments = await query(
        `SELECT
          sp.id,
          sp.created_at,
          sp.method,
          sp.status,
          sp.amount_inr,
          sp.payment_sequence,
          sp.gateway_provider,
          sp.gateway_reference,
          sp.cheque_mailed_at,
          sp.bank_transfer_confirmed_at,
          (sp.proof_attachment IS NOT NULL AND LENGTH(sp.proof_attachment) > 0) AS has_proof,
          sp.billing_legal_name,
          sp.billing_pan,
          sp.billing_gst_number,
          ep.company_name,
          ep.website,
          so.tier_name,
          so.category,
          sdrs.id AS receipt_send_id,
          sdrs.sent_at AS receipt_sent_at,
          sdrs.receipt_number AS receipt_number
         FROM sponsorship_payments sp
         JOIN employer_profiles ep ON ep.id = sp.employer_profile_id
         JOIN sponsorship_opportunities so ON so.id = sp.opportunity_id
         LEFT JOIN sponsorship_donation_receipt_sends sdrs ON sdrs.payment_id = sp.id
         WHERE sp.tenant_id = $1::uuid
         ORDER BY sp.created_at DESC
         LIMIT 200`,
        [tenantId],
      );
    } catch (e) {
      if (e.code === '42P01' && String(e.message || '').includes('sponsorship_donation_receipt_sends')) {
        receiptJoin = false;
        payments = await query(
          `SELECT
            sp.id,
            sp.created_at,
            sp.method,
            sp.status,
            sp.amount_inr,
            sp.payment_sequence,
            sp.gateway_provider,
            sp.gateway_reference,
            sp.cheque_mailed_at,
            sp.bank_transfer_confirmed_at,
            (sp.proof_attachment IS NOT NULL AND LENGTH(sp.proof_attachment) > 0) AS has_proof,
            sp.billing_legal_name,
            sp.billing_pan,
            sp.billing_gst_number,
            ep.company_name,
            ep.website,
            so.tier_name,
            so.category
           FROM sponsorship_payments sp
           JOIN employer_profiles ep ON ep.id = sp.employer_profile_id
           JOIN sponsorship_opportunities so ON so.id = sp.opportunity_id
           WHERE sp.tenant_id = $1::uuid
           ORDER BY sp.created_at DESC
           LIMIT 200`,
          [tenantId],
        );
      } else if (e.code === '42P01') {
        payments = { rows: [] };
      } else {
        throw e;
      }
    }

    return NextResponse.json({
      collegeName: tenant.name,
      categories,
      payments: payments.rows.map((p) => ({
        id: p.id,
        createdAt: p.created_at,
        method: p.method,
        status: p.status,
        amountLabel: formatInr(p.amount_inr),
        paymentSequence: p.payment_sequence,
        gatewayProvider: p.gateway_provider,
        gatewayReference: p.gateway_reference,
        chequeMailedAt: p.cheque_mailed_at,
        bankTransferConfirmedAt: p.bank_transfer_confirmed_at,
        hasProof: Boolean(p.has_proof),
        companyName: p.company_name,
        companyWebsite: p.website || null,
        billingLegalName: p.billing_legal_name || null,
        billingPan: p.billing_pan || null,
        billingGstNumber: p.billing_gst_number || null,
        tierName: p.tier_name,
        category: p.category,
        receiptSent: receiptJoin ? Boolean(p.receipt_send_id) : false,
        receiptSentAt: receiptJoin ? p.receipt_sent_at : null,
        receiptNumber: receiptJoin ? p.receipt_number : null,
      })),
    });
  } catch (error) {
    console.error('GET /api/college/sponsorships', error);
    return NextResponse.json({ error: 'Failed to load sponsorship opportunities' }, { status: 500 });
  }
}


const __platformApiHandlers = withApiHandlers({
  GET: __platform_GET,
}, { context: 'api_college_sponsorships' });
export const GET = __platformApiHandlers.GET;
