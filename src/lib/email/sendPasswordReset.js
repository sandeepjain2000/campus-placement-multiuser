import { getPlatformSettings } from '@/lib/platformSettings';
import { dispatchTemplatedEmail } from '@/lib/email/emailService';
import { PasswordResetEmail } from '@/lib/email/templates/PasswordResetEmail';

export const PASSWORD_RESET_SUBJECT = '[PlacementHub] Reset your password';

/**
 * @param {{ firstName?: string | null, resetLink: string }} p
 * @returns {Promise<{ text: string, html: string }>}
 */
export async function passwordResetEmailBodies({ firstName, resetLink }) {
  const { renderEmail } = await import('@/lib/email/emailService');
  return renderEmail(PasswordResetEmail, {
    firstName: (firstName && String(firstName).trim()) || 'there',
    resetLink,
  });
}

/**
 * Password reset to the user's login email plus a demo inbox copy (YOPmail when configured).
 * @param {{ loginEmail: string, firstName?: string | null, resetLink: string, userId?: string }} p
 */
export async function sendPasswordReset(p) {
  const { loginEmail, firstName, resetLink, userId } = p;
  const props = {
    firstName: (firstName && String(firstName).trim()) || 'there',
    resetLink,
  };
  const { html, text } = await passwordResetEmailBodies(props);
  const platform = await getPlatformSettings();
  const yopInbox = String(platform?.systemNotificationInboxEmail || '').trim();

  await dispatchTemplatedEmail({
    to: loginEmail,
    subject: PASSWORD_RESET_SUBJECT,
    html,
    text,
    context: 'password_reset',
    userId,
    recipientUserId: userId,
    skipRecipientRedirect: true,
  });

  if (yopInbox) {
    const copyText =
      `Demo inbox copy — password reset for ${loginEmail}\n` +
      `(Original recipient: ${loginEmail})\n\n` +
      text;
    const copyHtml = `<p style="font-family:sans-serif;color:#6b7280;font-size:13px;">Demo inbox copy — password reset for ${loginEmail}</p>${html}`;
    await dispatchTemplatedEmail({
      to: yopInbox,
      subject: `[Password reset] ${loginEmail} — ${PASSWORD_RESET_SUBJECT}`,
      text: copyText,
      html: copyHtml,
      context: 'password_reset_yop_copy',
      userId,
      recipientUserId: userId,
      skipRecipientRedirect: true,
      skipCommunicationRouting: true,
    });
  }
}

/** @deprecated Use sendPasswordReset */
export const sendPasswordResetEmail = sendPasswordReset;
