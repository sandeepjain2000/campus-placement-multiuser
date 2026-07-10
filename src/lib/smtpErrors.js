/**
 * Map SMTP / Nodemailer errors to short user-facing messages (no secrets).
 * @param {unknown} err
 */
export function smtpErrorForUser(err) {
  const msg = String(err?.message || err || '').trim();
  if (!msg) return 'Email could not be sent. Try again later or call support.';

  if (/daily user sending limit exceeded|550-5\.4\.5/i.test(msg)) {
    return (
      'Gmail daily sending limit was reached for the configured SMTP account. ' +
      'New messages (including login support) cannot be sent until the limit resets. ' +
      'Drive notification emails sent earlier may still appear in YOPmail.'
    );
  }
  if (/invalid login|username and password|535|534|authentication/i.test(msg)) {
    return 'SMTP login failed. Check SMTP_USER and SMTP_PASS (Gmail app password) in server environment variables.';
  }
  if (/connection timed out|ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
    return 'Could not connect to the mail server. Check SMTP_HOST and SMTP_PORT.';
  }

  return `Email could not be sent: ${msg.slice(0, 200)}`;
}
