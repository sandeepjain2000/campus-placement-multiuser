import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import {


  loadSystemEmailTemplate,
  renderTemplates,
} from '@/lib/campusGuestConfirmation';
import { SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY } from '@/lib/systemEmailTemplates';

export const dynamic = 'force-dynamic';
import { withApiHandlers } from '@/lib/platformErrorRoute';
export const revalidate = 0;


function getTenantId(session) {
  return session?.user?.tenantId || session?.user?.tenant_id;
}

function methodLabel(method) {
  const m = String(method || '');
  if (m === 'online') return 'Online (card / demo gateway)';
  if (m === 'cheque') return 'Cheque';
  if (m === 'bank_transfer') return 'Bank transfer';
  return m || '—';
}

function formatInr(n) {
  return new Intl.NumberFormat('en-IN').format(Number(n || 0));
}

async function __platform_POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const paymentId = String(body.paymentId || body.payment_id || '').trim();
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
    }

    const existing = await query(
      `SELECT id FROM sponsorship_donation_receipt_sends WHERE payment_id = $1::uuid`,
      [paymentId],
    );
    if (existing.rows[0]) {
      return NextResponse.json(
        { error: 'A receipt was already emailed for this payment.', alreadySent: true },
        { status: 409 },
      );
    }

    const payRes = await query(
      `SELECT
         sp.id,
         sp.amount_inr,
         sp.method,
         sp.created_at,
         sp.billing_legal_name,
         sp.billing_pan,
         sp.billing_gst_number,
         so.tier_name,
         so.category,
         ep.company_name,
         ep.user_id,
         u.first_name,
         u.last_name,
         u.email,
         u.communication_email,
         t.name AS college_name,
         t.city AS college_city,
         t.state AS college_state
       FROM sponsorship_payments sp
       INNER JOIN sponsorship_opportunities so ON so.id = sp.opportunity_id
       INNER JOIN employer_profiles ep ON ep.id = sp.employer_profile_id
       INNER JOIN users u ON u.id = ep.user_id
       INNER JOIN tenants t ON t.id = sp.tenant_id
       WHERE sp.id = $1::uuid AND sp.tenant_id = $2::uuid`,
      [paymentId, tenantId],
    );

    const row = payRes.rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Payment not found for your institution' }, { status: 404 });
    }

    const toEmail = String(row.communication_email || row.email || '').trim().toLowerCase();
    if (!toEmail) {
      return NextResponse.json({ error: 'Employer account has no email on file' }, { status: 400 });
    }

    const employerName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Sponsor contact';

    const receiptDate = new Date();
    const receiptDateStr = receiptDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const paymentRecordedStr = row.created_at
      ? new Date(row.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : '—';

    const idShort = String(paymentId).replace(/-/g, '').slice(0, 10).toUpperCase();
    const receiptNumber = `DON-${receiptDate.getFullYear()}${String(receiptDate.getMonth() + 1).padStart(2, '0')}${String(receiptDate.getDate()).padStart(2, '0')}-${idShort}`;

    const templateRow = await loadSystemEmailTemplate(SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY, {
      scopeType: 'college',
      scopeId: tenantId,
    });
    if (!templateRow) {
      return NextResponse.json({ error: 'Receipt email template not configured' }, { status: 500 });
    }

    const taxNote =
      'This receipt is issued for sponsorship / partnership consideration. Tax treatment (including Section 80G eligibility in India) depends on the institution’s registration status and your circumstances.';

    const billingLegal =
      String(row.billing_legal_name || '').trim() || String(row.company_name || '').trim() || 'Not provided';
    const billingPan = String(row.billing_pan || '').trim() || 'Not provided';
    const billingGst = String(row.billing_gst_number || '').trim() || 'Not provided';

    const vars = {
      collegeName: row.college_name || '',
      collegeCity: row.college_city || '',
      collegeState: row.college_state || '',
      employerCompany: row.company_name || '',
      employerName,
      employerEmail: toEmail,
      billingLegalName: billingLegal,
      billingPan,
      billingGstNumber: billingGst,
      receiptNumber,
      receiptDate: receiptDateStr,
      paymentRecordedDate: paymentRecordedStr,
      amountInr: formatInr(row.amount_inr),
      tierName: row.tier_name || '',
      category: row.category || '',
      paymentMethodLabel: methodLabel(row.method),
      taxNote,
    };

    const { subject, body: text } = renderTemplates(templateRow, vars);

    const mailResult = await sendMail({
      to: toEmail,
      subject,
      text,
      context: 'sponsorship_donation_receipt',
      userId: session.user.id,
    });

    if (mailResult.skipped) {
      return NextResponse.json(
        {
          error:
            'Outbound email is not configured. Set SMTP_USER, SMTP_PASS, and EMAIL_FROM (or use server docs).',
        },
        { status: 503 },
      );
    }

    await transaction(async (client) => {
      await client.query(
        `INSERT INTO sponsorship_donation_receipt_sends
           (payment_id, tenant_id, sent_by_user_id, to_email, receipt_number, subject)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)`,
        [paymentId, tenantId, session.user.id, toEmail, receiptNumber, subject],
      );
    });

    return NextResponse.json({
      ok: true,
      receiptNumber,
      toEmail,
    });
  } catch (e) {
    console.error('POST /api/college/sponsorships/receipt', e);
    const msg = String(e.message || '');
    const code = e.code;

    // Undefined column (e.g. billing_* on sponsorship_payments) — often confused with 034.
    if (code === '42703') {
      return NextResponse.json(
        {
          error:
            'Database is missing sponsorship billing columns. Run db/migrations/035_sponsorship_billing_legal.sql on the same DATABASE_URL as Vercel.',
          dbCode: '42703',
        },
        { status: 503 },
      );
    }

    // Undefined table — only this case is fixed by 034.
    if (code === '42P01' && /sponsorship_donation_receipt_sends/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            'Receipt table is missing on this database. Run db/migrations/034_sponsorship_donation_receipt.sql using the exact DATABASE_URL configured in Vercel (Settings → Environment Variables), then redeploy if the URL was wrong.',
          dbCode: '42P01',
        },
        { status: 503 },
      );
    }

    if (code === '23505') {
      return NextResponse.json({ error: 'Receipt already recorded for this payment.' }, { status: 409 });
    }

    return NextResponse.json(
      {
        error: msg || 'Failed to send receipt',
        dbCode: code != null ? String(code) : undefined,
      },
      { status: 500 },
    );
  }
}


const __platformApiHandlers = withApiHandlers({
  POST: __platform_POST,
}, { context: 'api_college_sponsorships_receipt' });
export const POST = __platformApiHandlers.POST;
