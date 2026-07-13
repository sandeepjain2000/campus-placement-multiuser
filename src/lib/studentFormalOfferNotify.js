import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { mirrorInAppAlertToYopmail } from '@/lib/notificationService';
import { formatCurrency } from '@/lib/utils';
import { buildOfferEmailLetterSection } from '@/lib/offerTemplateRender';
import { isPendingOfferStatus, normalizeOfferStatus } from '@/lib/offerStatusNormalize';
import { AND_OFFER_NOT_DELETED } from '@/lib/softDeleteSql';
import { STUDENT_PROFILE_ACTIVE_CLAUSE } from '@/lib/studentProfileActive';

function appOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

async function formalOfferAlreadyNotified(offerId, studentUserId, { programApplicationId, applicationId } = {}) {
  if (!studentUserId) return false;

  const refs = [];
  if (programApplicationId) refs.push(`internship-offer-app:${programApplicationId}`);
  if (applicationId) refs.push(`drive-offer-app:${applicationId}`);
  if (offerId) refs.push(`offer:${offerId}`);

  if (refs.length === 0) return false;

  try {
    for (const ref of refs) {
      const res = await query(
        `SELECT 1 FROM notifications
         WHERE user_id = $1::uuid
           AND title LIKE 'Formal offer%'
           AND message LIKE $2
         LIMIT 1`,
        [studentUserId, `%${ref}%`],
      );
      if (res.rows.length > 0) return true;
    }
    return false;
  } catch (err) {
    console.error('formalOfferAlreadyNotified check failed:', err);
    return false;
  }
}

async function formalOfferEmailRecentlySent(studentUserId, subject) {
  if (!studentUserId || !subject) return false;
  try {
    const res = await query(
      `SELECT 1 FROM mail_delivery_logs
       WHERE recipient_user_id = $1::uuid
         AND context = 'student_formal_offer'
         AND status = 'sent'
         AND subject_truncated = $2
         AND created_at > NOW() - INTERVAL '7 days'
       LIMIT 1`,
      [studentUserId, subject.slice(0, 500)],
    );
    return res.rows.length > 0;
  } catch (err) {
    console.error('formalOfferEmailRecentlySent check failed:', err);
    return false;
  }
}

/**
 * Notify student when a formal pending offer is published (email + in-app alert).
 * Selection notifications are separate — see studentSelectionNotify.js.
 *
 * @param {{
 *   studentUserId: string;
 *   email: string;
 *   firstName?: string;
 *   companyName: string;
 *   roleTitle: string;
 *   salary?: number | null;
 *   deadline?: string | Date | null;
 *   offerLetterUrl?: string | null;
 *   renderedLetterHtml?: string | null;
 *   offerId?: string | null;
 *   programApplicationId?: string | null;
 *   applicationId?: string | null;
 *   force?: boolean;
 * }} opts
 */
export async function notifyStudentFormalOffer({
  studentUserId,
  email,
  firstName,
  companyName,
  roleTitle,
  salary,
  deadline,
  offerLetterUrl,
  renderedLetterHtml,
  offerId,
  programApplicationId,
  applicationId,
  force = false,
}) {
  const subject = `[PlacementHub] Formal offer — ${companyName} · ${roleTitle}`;

  if (
    !force &&
    ((await formalOfferAlreadyNotified(offerId, studentUserId, { programApplicationId, applicationId })) ||
      (await formalOfferEmailRecentlySent(studentUserId, subject)))
  ) {
    return { sent: false, skipped: true, reason: 'already_notified' };
  }

  const origin = appOrigin();
  const offersLink = origin ? `${origin}/dashboard/student/offers` : '/dashboard/student/offers';
  const letterUrl = String(offerLetterUrl || '').trim();
  const rendered = String(renderedLetterHtml || '').trim();
  const ctcLine =
    salary != null && Number(salary) > 0 ? formatCurrency(salary) : 'See offer letter for compensation details';
  const deadlineText = deadline ? new Date(deadline).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : null;
  const refParts = [
    programApplicationId ? `internship-offer-app:${programApplicationId}` : '',
    applicationId ? `drive-offer-app:${applicationId}` : '',
    offerId ? `offer:${offerId}` : '',
  ].filter(Boolean);
  const offerRef = refParts.join(' ');

  const title = `Formal offer — ${companyName}`;
  const message = offerRef
    ? `Your formal offer for ${roleTitle} at ${companyName} is ready. Review the offer letter and respond on My Offers before the deadline. (${offerRef})`
    : `Your formal offer for ${roleTitle} at ${companyName} is ready. Review the offer letter and respond on My Offers before the deadline.`;

  try {
    await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [studentUserId, title, message, 'success', '/dashboard/student/offers'],
    );
    await mirrorInAppAlertToYopmail({
      title,
      message,
      type: 'success',
      link: '/dashboard/student/offers',
      audience: '1 student',
      recipientEmail: email || null,
      userId: studentUserId,
    });
  } catch (err) {
    console.error('Failed to create formal offer in-app notification:', err);
  }

  const letterBlock = rendered
    ? `<div style="margin: 16px 0; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${escapeHtml(buildOfferEmailLetterSection({ renderedLetter: rendered, salary }))}</div>`
    : letterUrl
      ? `<p style="margin: 16px 0;"><a href="${letterUrl}" style="display: inline-block; background-color: #0f766e; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600;">Download offer letter</a></p>`
      : `<p style="margin: 16px 0; color: #4b5563;">Your offer letter is available on PlacementHub under My Offers.</p>`;

  const html = `
    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
        <h2 style="margin: 0; color: #ffffff;">Formal offer issued</h2>
      </div>
      <div style="padding: 20px; line-height: 1.55;">
        <p>Hi ${firstName || 'there'},</p>
        <p><strong>${companyName}</strong> has issued a <strong>formal offer</strong> for <strong>${roleTitle}</strong>.</p>
        <p style="margin: 12px 0; padding: 12px 14px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
          This is separate from your earlier <em>selection</em> update. The formal offer includes compensation terms and requires your accept or decline response in PlacementHub.
        </p>
        ${rendered ? '' : `<p><strong>CTC:</strong> ${ctcLine}</p>`}
        ${deadlineText ? `<p><strong>Respond by:</strong> ${deadlineText}</p>` : ''}
        ${letterBlock}
        <div style="margin: 24px 0; text-align: center;">
          <a href="${offersLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review on My Offers</a>
        </div>
        <p style="font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px;">
          PlacementHub — formal offer notification${offerId ? ` (ref ${offerId})` : ''}.
        </p>
      </div>
    </div>
  `;

  const textLines = [
    `Hi ${firstName || 'there'},`,
    '',
    `${companyName} has issued a formal offer for ${roleTitle}.`,
    'This is separate from your selection update — review the offer letter and respond on My Offers.',
    `CTC: ${ctcLine}`,
    deadlineText ? `Respond by: ${deadlineText}` : '',
    rendered ? `Offer letter:\n${buildOfferEmailLetterSection({ renderedLetter: rendered, salary })}` : '',
    letterUrl ? `Offer letter: ${letterUrl}` : '',
    `My Offers: ${offersLink}`,
  ].filter(Boolean);

  try {
    await sendMail({
      to: email,
      subject,
      text: textLines.join('\n'),
      html,
      context: 'student_formal_offer',
      recipientUserId: studentUserId,
    });
    return { sent: true };
  } catch (err) {
    console.error('Failed to send formal offer email:', err);
    return { sent: false, reason: 'send_failed' };
  }
}

/**
 * Load offer + student contact and send formal-offer notification when status is pending.
 * @param {string} offerId
 * @param {{ force?: boolean }} [opts] — pass force: true for explicit resend
 * @returns {Promise<boolean>} true when notification was sent
 */
export async function notifyStudentFormalOfferByOfferId(offerId, { force = false } = {}) {
  if (!offerId) return false;

  const baseSql = (includeRendered) => `
    SELECT o.id, o.job_title, o.salary, o.deadline, o.offer_letter_url, ${includeRendered ? 'o.rendered_letter_html,' : ''} o.status,
            COALESCE(ep.company_name, o.reported_company_name, 'Company') AS company_name,
            u.id AS user_id,
            COALESCE(NULLIF(TRIM(u.communication_email), ''), u.email) AS email,
            u.first_name
     FROM offers o
     INNER JOIN student_profiles sp ON sp.id = o.student_id AND ${STUDENT_PROFILE_ACTIVE_CLAUSE}
     INNER JOIN users u ON u.id = sp.user_id
     LEFT JOIN employer_profiles ep ON ep.id = o.employer_id
     WHERE o.id = $1::uuid ${AND_OFFER_NOT_DELETED}
     LIMIT 1`;

  let res;
  try {
    res = await query(baseSql(true), [offerId]);
  } catch (e) {
    if (e?.code !== '42703' || !String(e?.message || '').includes('rendered_letter_html')) throw e;
    res = await query(baseSql(false), [offerId]);
  }

  const row = res.rows[0];
  if (!row?.user_id) return false;
  if (!isPendingOfferStatus(normalizeOfferStatus(row.status))) return false;

  const result = await notifyStudentFormalOffer({
    studentUserId: String(row.user_id),
    email: String(row.email || ''),
    firstName: row.first_name,
    companyName: String(row.company_name || 'Company'),
    roleTitle: String(row.job_title || 'Role'),
    salary: row.salary != null ? Number(row.salary) : null,
    deadline: row.deadline,
    offerLetterUrl: row.offer_letter_url,
    renderedLetterHtml: row.rendered_letter_html,
    offerId: String(row.id),
    force,
  });

  return result?.sent !== false;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
