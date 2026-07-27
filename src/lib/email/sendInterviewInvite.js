import {
  buildEmployerInterviewApplicantEmailBody,
  buildEmployerInterviewApplicantEmailSubject,
  buildInterviewInviteTemplateProps,
  INTERVIEW_TIMEFRAME_DISCLAIMER,
} from '@/lib/employerInterviewEmail';
import { dispatchTemplatedEmail, renderEmail } from '@/lib/email/emailService';
import { InterviewInviteEmail } from '@/lib/email/templates/InterviewInviteEmail';

export {
  INTERVIEW_TIMEFRAME_DISCLAIMER,
  buildEmployerInterviewApplicantEmailSubject,
  buildEmployerInterviewApplicantEmailBody,
};

/**
 * Send interview window email (HTML via React Email + plain text).
 * Server-only — do not import from Client Components.
 * @param {{
 *   to: string,
 *   slot: object,
 *   companyName?: string,
 *   campusName?: string,
 *   recipientName?: string,
 *   userId?: string,
 *   recipientUserId?: string,
 * }} opts
 */
export async function sendInterviewInvite(opts) {
  const { to, slot, companyName, campusName, recipientName, userId, recipientUserId } = opts;
  const ctx = { companyName, campusName, recipientName };
  const props = buildInterviewInviteTemplateProps(slot, ctx);
  const { html } = await renderEmail(InterviewInviteEmail, props);
  const text = buildEmployerInterviewApplicantEmailBody(slot, ctx);
  return dispatchTemplatedEmail({
    to,
    subject: buildEmployerInterviewApplicantEmailSubject(slot, ctx),
    html,
    text,
    context: 'interview_invite',
    userId,
    recipientUserId,
  });
}
