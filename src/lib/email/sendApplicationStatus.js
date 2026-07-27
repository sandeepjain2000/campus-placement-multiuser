import { dispatchTemplatedEmail, renderEmail } from '@/lib/email/emailService';
import { ApplicationStatusEmail } from '@/lib/email/templates/ApplicationStatusEmail';

/**
 * Application received confirmation.
 * @param {{
 *   to: string,
 *   firstName?: string,
 *   company: string,
 *   role: string,
 *   typeLabel: string,
 *   applicationId?: string,
 *   applicationsUrl: string,
 *   recipientUserId?: string,
 * }} opts
 */
export async function sendApplicationSubmitted(opts) {
  const {
    to,
    firstName,
    company,
    role,
    typeLabel,
    applicationId,
    applicationsUrl,
    recipientUserId,
  } = opts;
  const subject = `[PlacementHub] Application received — ${role} at ${company}`;
  const rows = [
    { label: 'Company', value: company },
    { label: 'Role', value: role },
    { label: 'Type', value: typeLabel },
  ];
  if (applicationId) {
    rows.push({ label: 'Reference', value: String(applicationId).slice(0, 8) });
  }
  const { html, text } = await renderEmail(ApplicationStatusEmail, {
    variant: 'submitted',
    firstName: firstName || 'there',
    title: 'Application received',
    intro: `We received your ${String(typeLabel || '').toLowerCase()} application.`,
    rows,
    ctaLabel: 'View My Applications',
    ctaUrl: applicationsUrl,
    footerNote: 'This is an automated confirmation from PlacementHub.',
  });
  return dispatchTemplatedEmail({
    to,
    subject,
    html,
    text,
    context: 'student_application_submitted',
    recipientUserId,
  });
}

/**
 * Selection outcome (not the formal offer).
 * @param {{
 *   to: string,
 *   subject: string,
 *   firstName?: string,
 *   companyName: string,
 *   roleTitle: string,
 *   applicationsUrl: string,
 *   appRef?: string,
 *   recipientUserId?: string,
 * }} opts
 */
export async function sendApplicationSelected(opts) {
  const {
    to,
    subject,
    firstName,
    companyName,
    roleTitle,
    applicationsUrl,
    appRef,
    recipientUserId,
  } = opts;
  const { html, text } = await renderEmail(ApplicationStatusEmail, {
    variant: 'selected',
    firstName: firstName || 'there',
    title: 'Selection update',
    intro: `Congratulations — ${companyName} has marked you selected for ${roleTitle}.`,
    callout:
      'This is your selection outcome, not the formal offer. When the employer or placement office publishes the drafted offer letter, you will receive a separate email and can accept or decline on My Offers.',
    ctaLabel: 'View My Applications',
    ctaUrl: applicationsUrl,
    footerNote: `PlacementHub — selection notification (formal offer will follow separately)${appRef ? ` · ${appRef}` : ''}.`,
  });
  return dispatchTemplatedEmail({
    to,
    subject,
    html,
    text,
    context: 'student_selection',
    recipientUserId,
  });
}

/** Alias used by the email/ folder API. */
export async function sendApplicationStatus(opts) {
  if (opts.variant === 'selected') return sendApplicationSelected(opts);
  return sendApplicationSubmitted(opts);
}
