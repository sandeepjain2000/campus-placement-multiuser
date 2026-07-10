import nodemailer from 'nodemailer';
import { getPlatformSettings } from '@/lib/platformSettings';

function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
  const user = process.env.SMTP_USER;
  /** Gmail app passwords may be pasted with spaces; SMTP expects 16 chars without spaces. */
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Resolve final recipients. Env wins for emergency override; else super-admin "system notification inbox"
 * (when set); otherwise the original address(es).
 * @param {string | string[]} originalTo
 * @param {Awaited<ReturnType<typeof getPlatformSettings>>} platform
 */
function resolveRecipients(originalTo, platform) {
  const envOverride = process.env.OUTBOUND_EMAIL_OVERRIDE?.trim();
  if (envOverride) return envOverride;
  const inbox = String(platform?.systemNotificationInboxEmail || '').trim();
  if (inbox) return inbox;
  return originalTo;
}

function formatFrom(platform) {
  const addr = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!addr) return null;
  const name = String(platform?.systemNotificationSenderName || platform?.platformName || 'PlacementHub').trim();
  const safeName = name.replace(/["\r\n]/g, '');
  if (addr.includes('<') && addr.includes('>')) return addr;
  return `"${safeName}" <${addr}>`;
}

/**
 * @param {{ to: string | string[], subject: string, text: string, html?: string }} opts
 */
export async function sendMail(opts) {
  const platform = await getPlatformSettings();
  const from = formatFrom(platform);
  if (!from) {
    console.warn('[mail] EMAIL_FROM / SMTP_USER not set; logging only');
    console.log('[mail would send]', opts.to, opts.subject);
    return { skipped: true };
  }

  const transport = createTransport();
  if (!transport) {
    console.warn('[mail] SMTP_USER / SMTP_PASS not set; logging only');
    console.log('[mail would send]', opts.to, opts.subject, opts.text?.slice(0, 200));
    return { skipped: true };
  }

  const to = resolveRecipients(opts.to, platform);
  await transport.sendMail({
    from,
    to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html || opts.text.replace(/\n/g, '<br/>'),
  });
  return { sent: true };
}
