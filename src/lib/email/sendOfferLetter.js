import { dispatchTemplatedEmail, renderEmail } from '@/lib/email/emailService';
import { OfferLetterEmail } from '@/lib/email/templates/OfferLetterEmail';

/**
 * Formal offer email (letter body as plain text for safe rendering).
 * @param {{
 *   to: string,
 *   subject: string,
 *   firstName?: string,
 *   companyName: string,
 *   roleTitle: string,
 *   ctcLine?: string,
 *   deadlineText?: string,
 *   letterText?: string,
 *   letterUrl?: string,
 *   offersLink: string,
 *   offerId?: string,
 *   recipientUserId?: string,
 * }} opts
 */
export async function sendOfferLetter(opts) {
  const {
    to,
    subject,
    firstName,
    companyName,
    roleTitle,
    ctcLine,
    deadlineText,
    letterText,
    letterUrl,
    offersLink,
    offerId,
    recipientUserId,
  } = opts;

  const { html, text } = await renderEmail(OfferLetterEmail, {
    firstName: firstName || 'there',
    companyName,
    roleTitle,
    ctcLine,
    deadlineText,
    letterHtml: letterText || undefined,
    letterUrl: letterText ? undefined : letterUrl,
    offersLink,
    offerId,
  });

  return dispatchTemplatedEmail({
    to,
    subject,
    html,
    text,
    context: 'student_formal_offer',
    recipientUserId,
  });
}
