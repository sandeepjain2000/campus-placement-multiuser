import { query } from '@/lib/db';
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

  const letterText = rendered
    ? buildOfferEmailLetterSection({ renderedLetter: rendered, salary })
    : undefined;

  try {
    const { sendOfferLetter } = await import('@/lib/email/sendOfferLetter');
    await sendOfferLetter({
      to: email,
      subject,
      firstName,
      companyName,
      roleTitle,
      ctcLine: rendered ? undefined : ctcLine,
      deadlineText: deadlineText || undefined,
      letterText,
      letterUrl: rendered ? undefined : letterUrl || undefined,
      offersLink,
      offerId,
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
