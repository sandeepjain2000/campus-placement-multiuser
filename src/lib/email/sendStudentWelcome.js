import { getPlatformSettings } from '@/lib/platformSettings';
import { dispatchTemplatedEmail, renderEmail } from '@/lib/email/emailService';
import { StudentWelcomeEmail } from '@/lib/email/templates/StudentWelcomeEmail';

export const STUDENT_WELCOME_SUBJECT = 'Your PlacementHub Account is Ready';

/**
 * @param {{ firstName?: string | null, email: string, tempPass: string, systemId: string, collegeName?: string }} p
 */
export function studentWelcomeEmailBody(p) {
  const fn = (p.firstName && String(p.firstName).trim()) || 'Student';
  const campus = p.collegeName ? ` at ${p.collegeName}` : '';
  return (
    `Hello ${fn},\n\n` +
    `Your college has added you to PlacementHub${campus}. Student self-registration is not used — your profile details come from the campus master list.\n\n` +
    `Sign in at the PlacementHub login page with:\n` +
    `  Login email: ${p.email}\n` +
    `  Password: ${p.tempPass}\n\n` +
    `You may keep this password; changing it is optional.\n\n` +
    `Roll / system ID: ${p.systemId}\n\n` +
    `If you did not expect this message, contact your placement office.\n\n` +
    `Best regards,\nPlacementHub Team`
  );
}

/**
 * @param {{ loginEmail: string, firstName?: string, tempPass: string, systemId: string, collegeName?: string, userId?: string }} p
 */
export async function sendStudentWelcome(p) {
  const { loginEmail, firstName, tempPass, systemId, collegeName, userId } = p;
  const props = {
    firstName: (firstName && String(firstName).trim()) || 'Student',
    email: loginEmail,
    tempPass,
    systemId,
    collegeName,
  };
  const { html, text } = await renderEmail(StudentWelcomeEmail, props);
  const platform = await getPlatformSettings();
  const yopInbox = String(platform?.systemNotificationInboxEmail || '').trim();

  await dispatchTemplatedEmail({
    to: loginEmail,
    subject: STUDENT_WELCOME_SUBJECT,
    html,
    text,
    context: 'student_welcome',
    userId,
    recipientUserId: userId,
    skipRecipientRedirect: true,
  });

  if (yopInbox) {
    const copyText =
      `Demo inbox copy — student welcome for ${loginEmail}\n` +
      `(Original recipient: ${loginEmail})\n\n` +
      text;
    await dispatchTemplatedEmail({
      to: yopInbox,
      subject: `[Student welcome] ${loginEmail} — ${STUDENT_WELCOME_SUBJECT}`,
      text: copyText,
      html: `<p style="font-family:sans-serif;color:#6b7280;font-size:13px;">Demo inbox copy — student welcome for ${loginEmail}</p>${html}`,
      context: 'student_welcome_yop_copy',
      userId,
      skipRecipientRedirect: true,
      skipCommunicationRouting: true,
    });
  }
}

/** @deprecated Use sendStudentWelcome */
export const sendStudentWelcomeEmails = sendStudentWelcome;
