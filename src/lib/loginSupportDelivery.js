import { query } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { resolveSupportInboxEmail } from '@/lib/supportContact';
import { smtpErrorForUser } from '@/lib/smtpErrors';

function buildBodies(replyEmail, subject, message) {
  const text =
    `Support request from login page\n\n` +
    `From: ${replyEmail}\n` +
    `Subject: ${subject}\n\n` +
    `${message}\n`;

  const html = `<p><strong>Support request</strong> (login page)</p>
<p><strong>From:</strong> ${replyEmail}</p>
<p><strong>Subject:</strong> ${subject}</p>
<hr/>
<p style="white-space:pre-wrap">${message.replace(/</g, '&lt;')}</p>`;

  return { text, html };
}

const SKIP_REASON_MESSAGES = {
  no_from: 'Outbound email is not configured (missing From address).',
  no_smtp_credentials: 'Outbound email is not configured (SMTP credentials missing on the server).',
  daily_limit_reached: 'The daily email send limit has been reached. Try again tomorrow.',
};

async function persistLoginSupportMessage({ replyEmail, subject, message, inbox, deliveryMode }) {
  try {
    await query(
      `INSERT INTO login_support_messages (reply_email, subject, message, inbox_email, delivery_mode)
       VALUES ($1, $2, $3, $4, $5)`,
      [replyEmail, subject, message, inbox, deliveryMode],
    );
    return true;
  } catch (err) {
    console.warn('[login_support] DB persist failed (run migration 061?):', err?.message || err);
    return false;
  }
}

/**
 * Send login support mail to the YOPmail demo inbox via SMTP (same pipeline as drive notifications).
 * @param {{ replyEmail: string, subject: string, message: string, platform: object }} params
 */
export async function deliverLoginSupportMessage({ replyEmail, subject, message, platform }) {
  const inbox = resolveSupportInboxEmail(platform);
  const { text, html } = buildBodies(replyEmail, subject, message);
  const mailSubject = `[PlacementHub] Login support - ${subject}`;

  let mailResult;
  try {
    mailResult = await sendMail({
      to: inbox,
      replyTo: replyEmail,
      subject: mailSubject,
      text,
      html,
      context: 'login_support',
      skipCommunicationRouting: true,
      skipRecipientRedirect: true,
    });
  } catch (err) {
    console.error('[login_support] SMTP error:', err?.message || err);
    await persistLoginSupportMessage({
      replyEmail,
      subject,
      message,
      inbox,
      deliveryMode: 'failed',
    });
    return {
      ok: false,
      smtpDelivered: false,
      deliveredTo: inbox,
      message: smtpErrorForUser(err),
      error: err?.message || 'send_failed',
    };
  }

  if (mailResult?.skipped) {
    const reason = mailResult.reason || 'unknown';
    await persistLoginSupportMessage({
      replyEmail,
      subject,
      message,
      inbox,
      deliveryMode: 'skipped',
    });
    const detail = SKIP_REASON_MESSAGES[reason] || 'Email delivery is not configured on this server.';
    return {
      ok: false,
      smtpDelivered: false,
      deliveredTo: inbox,
      message: `${detail} Your message was not sent to YOPmail. Call the support number or try again later.`,
      error: reason,
    };
  }

  if (mailResult?.sent) {
    await persistLoginSupportMessage({
      replyEmail,
      subject,
      message,
      inbox,
      deliveryMode: 'smtp',
    });
    return {
      ok: true,
      smtpDelivered: true,
      deliveredTo: inbox,
      message: `Your message was emailed to ${inbox}. Refresh YOPmail — look for subject “${mailSubject}”.`,
    };
  }

  return {
    ok: false,
    smtpDelivered: false,
    deliveredTo: inbox,
    message: 'Could not deliver your email. Try again or call the support number.',
    error: 'unknown',
  };
}
