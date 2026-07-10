import { query, transaction } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { loadSystemEmailTemplate, renderTemplates } from '@/lib/campusGuestConfirmation';
import {
  SPONSORSHIP_COLLEGE_THANKS_SPONSOR_TEMPLATE_KEY,
  SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY,
} from '@/lib/systemEmailTemplates';

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

function placementSeasonLabelFromTenant(settings) {
  if (!settings || typeof settings !== 'object') return 'the current placement season';
  const v = settings.placementSeasonLabel;
  if (v != null && String(v).trim()) return String(v).trim();
  return 'the current placement season';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * After a sponsorship payment is recorded: sends (1) college thank-you, (2) receipt — two separate messages.
 * Inserts sponsorship_donation_receipt_sends so college admins do not duplicate the receipt manually.
 * Failures are logged; does not throw for SMTP skip (returns status flags).
 *
 * @param {string} paymentId
 * @returns {Promise<{ thankYou: string, receipt: string, receiptNumber?: string }>}
 */
export async function sendAutomatedSponsorshipPaymentEmails(paymentId) {
  const out = { thankYou: 'skipped', receipt: 'skipped', receiptNumber: undefined };

  const payRes = await query(
    `SELECT
       sp.id,
       sp.tenant_id,
       sp.amount_inr,
       sp.method,
       sp.created_at,
       sp.billing_legal_name,
       sp.billing_pan,
       sp.billing_gst_number,
       so.tier_name,
       so.category,
       ep.company_name,
       u.first_name,
       u.last_name,
       u.email,
       u.communication_email,
       t.name AS college_name,
       t.city AS college_city,
       t.state AS college_state,
       t.settings AS tenant_settings
     FROM sponsorship_payments sp
     INNER JOIN sponsorship_opportunities so ON so.id = sp.opportunity_id
     INNER JOIN employer_profiles ep ON ep.id = sp.employer_profile_id
     INNER JOIN users u ON u.id = ep.user_id
     INNER JOIN tenants t ON t.id = sp.tenant_id
     WHERE sp.id = $1::uuid
     LIMIT 1`,
    [paymentId],
  );

  const row = payRes.rows[0];
  if (!row) {
    console.warn('[sponsorshipAutoEmails] payment not found', paymentId);
    return out;
  }

  const toEmail = String(row.communication_email || row.email || '').trim().toLowerCase();
  if (!toEmail) {
    console.warn('[sponsorshipAutoEmails] no employer email for payment', paymentId);
    out.thankYou = 'no_recipient';
    out.receipt = 'no_recipient';
    return out;
  }

  const employerName =
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Sponsor contact';
  const placementSeasonLabel = placementSeasonLabelFromTenant(row.tenant_settings);
  const amountInr = formatInr(row.amount_inr);
  const amountInrCurrency = `₹${amountInr}`;

  const collegeScope = { scopeType: 'college', scopeId: row.tenant_id };
  const thankTemplate = await loadSystemEmailTemplate(
    SPONSORSHIP_COLLEGE_THANKS_SPONSOR_TEMPLATE_KEY,
    collegeScope,
  );
  if (thankTemplate) {
    const thankVars = {
      collegeName: row.college_name || '',
      collegeCity: row.college_city || '',
      collegeState: row.college_state || '',
      employerName,
      employerEmail: toEmail,
      employerCompany: row.company_name || '',
      sponsorshipTierName: row.tier_name || '',
      sponsorshipCategory: row.category || '',
      amountInr: amountInrCurrency,
      placementSeasonLabel,
    };
    const { subject, body: text } = renderTemplates(thankTemplate, thankVars);
    try {
      const r = await sendMail({
        to: toEmail,
        subject,
        text,
        context: 'sponsorship_college_thanks_sponsor',
        userId: null,
      });
      out.thankYou = r.skipped ? 'skipped_smtp' : 'sent';
    } catch (e) {
      console.error('[sponsorshipAutoEmails] thank-you send failed', e);
      out.thankYou = 'failed';
    }
  } else {
    console.warn('[sponsorshipAutoEmails] thank-you template missing');
    out.thankYou = 'no_template';
  }

  // Space out messages so providers are less likely to drop or merge the second message.
  await delay(1200);

  const existing = await query(`SELECT id FROM sponsorship_donation_receipt_sends WHERE payment_id = $1::uuid`, [
    paymentId,
  ]);
  if (existing.rows[0]) {
    out.receipt = 'already_sent';
    return out;
  }

  const receiptTemplate = await loadSystemEmailTemplate(SPONSORSHIP_DONATION_RECEIPT_TEMPLATE_KEY, collegeScope);
  if (!receiptTemplate) {
    console.warn('[sponsorshipAutoEmails] receipt template missing');
    out.receipt = 'no_template';
    return out;
  }

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
  out.receiptNumber = receiptNumber;

  const taxNote =
    'This receipt is issued for sponsorship / partnership consideration. Tax treatment (including Section 80G eligibility in India) depends on the institution’s registration status and your circumstances.';

  const billingLegal =
    String(row.billing_legal_name || '').trim() || String(row.company_name || '').trim() || 'Not provided';
  const billingPan = String(row.billing_pan || '').trim() || 'Not provided';
  const billingGst = String(row.billing_gst_number || '').trim() || 'Not provided';

  const receiptVars = {
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
    amountInr,
    tierName: row.tier_name || '',
    category: row.category || '',
    paymentMethodLabel: methodLabel(row.method),
    taxNote,
  };

  const { subject: receiptSubject, body: receiptText } = renderTemplates(receiptTemplate, receiptVars);

  let mailResult = null;
  const maxReceiptAttempts = 3;
  for (let attempt = 1; attempt <= maxReceiptAttempts; attempt += 1) {
    try {
      mailResult = await sendMail({
        to: toEmail,
        subject: receiptSubject,
        text: receiptText,
        context: 'sponsorship_donation_receipt_auto',
        userId: null,
      });
      if (mailResult.skipped) {
        out.receipt = 'skipped_smtp';
        console.info('[sponsorshipAutoEmails] receipt skipped (SMTP)', { paymentId, attempt });
        return out;
      }
      break;
    } catch (e) {
      console.error('[sponsorshipAutoEmails] receipt send failed', { paymentId, attempt, message: e?.message });
      if (attempt === maxReceiptAttempts) {
        out.receipt = 'failed';
        return out;
      }
      await delay(2000 * attempt);
    }
  }

  try {
    await transaction(async (client) => {
      await client.query(
        `INSERT INTO sponsorship_donation_receipt_sends
           (payment_id, tenant_id, sent_by_user_id, to_email, receipt_number, subject)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)`,
        [paymentId, row.tenant_id, null, toEmail, receiptNumber, receiptSubject],
      );
    });
    out.receipt = 'sent';
  } catch (e) {
    console.error('[sponsorshipAutoEmails] receipt log insert failed', e);
    out.receipt = 'sent_log_failed';
  }

  console.info('[sponsorshipAutoEmails] done', {
    paymentId,
    thankYou: out.thankYou,
    receipt: out.receipt,
    receiptNumber: out.receiptNumber,
  });

  return out;
}
