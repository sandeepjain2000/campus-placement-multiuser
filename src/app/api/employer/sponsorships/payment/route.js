import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';
import { sendAutomatedSponsorshipPaymentEmails } from '@/lib/sponsorshipAutoEmails';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;




const METHODS = new Set(['online', 'cheque', 'bank_transfer']);
const MAX_PROOF_CHARS = 450_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Best-effort row for sponsorship_payment_error_logs (migration 037). */
async function logSponsorshipPaymentFailure({ userId, opportunityId, method, error }) {
  let oppId = null;
  if (opportunityId && UUID_RE.test(String(opportunityId).trim())) {
    oppId = String(opportunityId).trim();
  }
  const detail = {
    name: error?.name,
    stack:
      typeof error?.stack === 'string' ? error.stack.split('\n').slice(0, 14).join('\n') : undefined,
  };
  try {
    await query(
      `INSERT INTO sponsorship_payment_error_logs (user_id, opportunity_id, method, error_code, error_message, detail)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb)`,
      [
        userId || null,
        oppId,
        method ? String(method).slice(0, 24) : null,
        error?.code != null ? String(error.code) : null,
        error?.message != null ? String(error.message).slice(0, 8000) : 'unknown',
        JSON.stringify(detail),
      ],
    );
  } catch (e) {
    console.warn('[employer/sponsorships/payment] error log insert skipped:', e.message);
  }
}

/** @returns {{ legal: string|null, pan: string|null, gst: string|null } | { error: string }} */
function normalizeBilling(body) {
  const legalRaw = String(body?.billingLegalName ?? body?.billing_legal_name ?? '').trim();
  const legal = legalRaw.length > 280 ? legalRaw.slice(0, 280) : legalRaw;
  const legalOut = legal || null;

  let panRaw = String(body?.billingPan ?? body?.billing_pan ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (panRaw.length > 10) panRaw = panRaw.slice(0, 10);
  if (panRaw && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panRaw)) {
    return { error: 'PAN must be 10 characters in format AAAAA9999A (letters and digits only)' };
  }
  const panOut = panRaw || null;

  let gstRaw = String(body?.billingGstNumber ?? body?.billing_gst_number ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (gstRaw.length > 18) gstRaw = gstRaw.slice(0, 18);
  if (gstRaw && gstRaw.length !== 15) {
    return { error: 'GSTIN must be exactly 15 characters when provided' };
  }
  if (gstRaw && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstRaw)) {
    return { error: 'GSTIN format looks invalid' };
  }
  const gstOut = gstRaw || null;

  return { legal: legalOut, pan: panOut, gst: gstOut };
}

async function __platform_POST(request) {
  let session = null;
  let opportunityId = null;
  let method = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    opportunityId = String(body.opportunityId || '').trim();
    method = String(body.method || '').trim();
    const proofDataUrl = body.proofDataUrl != null ? String(body.proofDataUrl) : '';

    if (!opportunityId || !METHODS.has(method)) {
      return NextResponse.json({ error: 'opportunityId and valid method are required' }, { status: 400 });
    }

    if (method === 'bank_transfer' && proofDataUrl.length > MAX_PROOF_CHARS) {
      return NextResponse.json({ error: 'Screenshot / proof is too large (max ~450KB as data URL)' }, { status: 400 });
    }

    const billing = normalizeBilling(body);
    if ('error' in billing) {
      return NextResponse.json({ error: billing.error }, { status: 400 });
    }

    const epRes = await query(`SELECT id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1`, [session.user.id]);
    const employerProfileId = epRes.rows[0]?.id;
    if (!employerProfileId) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 400 });
    }

    const oppRes = await query(
      `SELECT id, tenant_id, price_inr, tier_name, category
       FROM sponsorship_opportunities
       WHERE id = $1::uuid AND is_active = true
       LIMIT 1`,
      [opportunityId],
    );
    const opp = oppRes.rows[0];
    if (!opp) {
      return NextResponse.json({ error: 'Sponsorship opportunity not found' }, { status: 404 });
    }

    const cntRes = await query(
      `SELECT COUNT(*)::int AS n, COALESCE(MAX(payment_sequence), 0) AS max_seq
       FROM sponsorship_payments
       WHERE opportunity_id = $1::uuid AND employer_profile_id = $2::uuid`,
      [opportunityId, employerProfileId],
    );
    const { n: existingCount, max_seq: maxSeq } = cntRes.rows[0];
    if (existingCount >= 1) {
      return NextResponse.json({ error: 'A payment is already recorded for this tier for your company' }, { status: 400 });
    }

    const paymentSequence = Number(maxSeq) + 1;
    const amountInr = Math.max(1, Math.floor(Number(opp.price_inr) || 0));

    const gatewayRef = method === 'online' ? `stripes123_${randomUUID().slice(0, 8)}` : null;

    await query(
      `UPDATE employer_profiles
       SET billing_legal_name = COALESCE($1, billing_legal_name),
           billing_pan = COALESCE($2, billing_pan),
           billing_gst_number = COALESCE($3, billing_gst_number),
           updated_at = NOW()
       WHERE id = $4::uuid`,
      [billing.legal, billing.pan, billing.gst, employerProfileId],
    );

    if (method === 'online') {
      const ins = await query(
        `INSERT INTO sponsorship_payments (
          opportunity_id, employer_profile_id, tenant_id, payment_sequence, amount_inr, method, status,
          gateway_provider, gateway_reference,
          billing_legal_name, billing_pan, billing_gst_number,
          updated_at
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'online', 'completed',
          'Stripes-123', $6, $7, $8, $9, NOW())
        RETURNING id, payment_sequence, amount_inr, status, gateway_reference, created_at`,
        [
          opportunityId,
          employerProfileId,
          opp.tenant_id,
          paymentSequence,
          amountInr,
          gatewayRef,
          billing.legal,
          billing.pan,
          billing.gst,
        ],
      );
      const payment = ins.rows[0];
      try {
        const emails = await sendAutomatedSponsorshipPaymentEmails(payment.id);
        return NextResponse.json({ payment, sponsorshipEmails: emails }, { status: 201 });
      } catch (e) {
        console.error('[employer sponsorship payment] automated emails error', e);
        return NextResponse.json({ payment, sponsorshipEmails: { error: 'email_step_failed' } }, { status: 201 });
      }
    }

    if (method === 'cheque') {
      const ins = await query(
        `INSERT INTO sponsorship_payments (
          opportunity_id, employer_profile_id, tenant_id, payment_sequence, amount_inr, method, status,
          cheque_mailed_at,
          billing_legal_name, billing_pan, billing_gst_number,
          updated_at
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'cheque', 'cheque_mailed',
          NOW(), $6, $7, $8, NOW())
        RETURNING id, payment_sequence, amount_inr, status, cheque_mailed_at, created_at`,
        [
          opportunityId,
          employerProfileId,
          opp.tenant_id,
          paymentSequence,
          amountInr,
          billing.legal,
          billing.pan,
          billing.gst,
        ],
      );
      const payment = ins.rows[0];
      try {
        const emails = await sendAutomatedSponsorshipPaymentEmails(payment.id);
        return NextResponse.json({ payment, sponsorshipEmails: emails }, { status: 201 });
      } catch (e) {
        console.error('[employer sponsorship payment] automated emails error', e);
        return NextResponse.json({ payment, sponsorshipEmails: { error: 'email_step_failed' } }, { status: 201 });
      }
    }

    const proof = proofDataUrl.trim() || null;
    const ins = await query(
      `INSERT INTO sponsorship_payments (
        opportunity_id, employer_profile_id, tenant_id, payment_sequence, amount_inr, method, status,
        bank_transfer_confirmed_at, proof_attachment,
        billing_legal_name, billing_pan, billing_gst_number,
        updated_at
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'bank_transfer', 'bank_transfer_submitted',
        NOW(), $6, $7, $8, $9, NOW())
      RETURNING id, payment_sequence, amount_inr, status, bank_transfer_confirmed_at, created_at`,
      [
        opportunityId,
        employerProfileId,
        opp.tenant_id,
        paymentSequence,
        amountInr,
        proof,
        billing.legal,
        billing.pan,
        billing.gst,
      ],
    );
    const payment = ins.rows[0];
    try {
      const emails = await sendAutomatedSponsorshipPaymentEmails(payment.id);
      return NextResponse.json({ payment, sponsorshipEmails: emails }, { status: 201 });
    } catch (e) {
      console.error('[employer sponsorship payment] automated emails error', e);
      return NextResponse.json({ payment, sponsorshipEmails: { error: 'email_step_failed' } }, { status: 201 });
    }
  } catch (error) {
    console.error('POST /api/employer/sponsorships/payment', error);
    const userId = session?.user?.id;
    await logSponsorshipPaymentFailure({
      userId,
      opportunityId,
      method,
      error,
    });

    if (error.code === '23505') {
      return NextResponse.json({ error: 'Duplicate payment sequence — refresh and try again' }, { status: 409 });
    }
    if (error.code === '42703') {
      return NextResponse.json(
        {
          error:
            'Database schema is missing columns required for sponsorship payments (billing fields). Run db/migrations/035_sponsorship_billing_legal.sql, then retry.',
          dbCode: '42703',
        },
        { status: 503 },
      );
    }
    if (error.code === '42P01') {
      return NextResponse.json(
        {
          error:
            'A required database table or relation is missing. Apply pending migrations (e.g. 026, 034–037). See server logs for the exact relation name.',
          dbCode: '42P01',
        },
        { status: 503 },
      );
    }
    if (error.message?.includes('sponsorship_payments')) {
      return NextResponse.json(
        { error: 'Sponsorship payments table missing — run db/migrations/026_sponsorship_payments.sql', dbCode: '42P01' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: 'Failed to record payment',
        ...(error.code ? { dbCode: String(error.code) } : {}),
      },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_employer_sponsorships_payment' });
export const POST = __platformApiHandlers.POST;
