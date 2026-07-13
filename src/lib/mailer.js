import nodemailer from 'nodemailer';
import { getPlatformSettings } from '@/lib/platformSettings';
import { query } from '@/lib/db';
import { getSmtpDailyLimitState } from '@/lib/mailDailyLimit';

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
function resolveRecipients(originalTo, platform, { skipRecipientRedirect = false } = {}) {
  if (skipRecipientRedirect) {
    return originalTo;
  }
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

function normalizeTo(v) {
  if (Array.isArray(v)) return v.join(', ');
  return v == null ? '' : String(v);
}

/** Extract bare email from `addr` or `"Name" <addr>`. */
function extractEmailFromRaw(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const m = s.match(/<([^<>]+@[^<>]+)>/);
  if (m) return m[1].trim();
  return s;
}

/**
 * If `address` matches a user or tenant primary email, return their communication_email (fallback: primary email).
 */
async function resolveCommunicationRouteForAddress(address) {
  const extracted = extractEmailFromRaw(address);
  if (!extracted.includes('@')) return null;
  const lower = extracted.toLowerCase();
  try {
    const r = await query(
      `SELECT COALESCE(
         (SELECT COALESCE(NULLIF(TRIM(u.communication_email), ''), u.email)
          FROM users u WHERE LOWER(u.email) = $1 LIMIT 1),
         (SELECT COALESCE(NULLIF(TRIM(t.communication_email), ''), t.email)
          FROM tenants t WHERE t.email IS NOT NULL AND LOWER(t.email) = $1 LIMIT 1)
       ) AS resolved`,
      [lower],
    );
    const resolved = r.rows[0]?.resolved;
    if (resolved && String(resolved).trim()) return String(resolved).trim();
  } catch (e) {
    console.warn('[mail] resolveCommunicationRouteForAddress failed:', e.message);
  }
  return null;
}

/**
 * Rewrite each recipient to users.communication_email / tenants.communication_email when the address is known.
 * Unknown addresses are unchanged. Then platform override (OUTBOUND_EMAIL_OVERRIDE / system inbox) still applies.
 * @param {string | string[]} to
 */
async function routeThroughCommunicationEmails(to) {
  if (Array.isArray(to)) {
    const out = [];
    for (const item of to) {
      const raw = String(item || '').trim();
      if (!raw) continue;
      const extracted = extractEmailFromRaw(raw);
      const resolved = await resolveCommunicationRouteForAddress(extracted);
      if (resolved && resolved.toLowerCase() !== extracted.toLowerCase()) {
        out.push(resolved);
      } else {
        out.push(raw);
      }
    }
    return out;
  }
  if (typeof to === 'string' && to.includes(',')) {
    const parts = to.split(',').map((p) => p.trim()).filter(Boolean);
    const routed = await routeThroughCommunicationEmails(parts);
    return routed.join(', ');
  }
  const raw = String(to || '').trim();
  if (!raw) return to;
  const extracted = extractEmailFromRaw(raw);
  const resolved = await resolveCommunicationRouteForAddress(extracted);
  if (resolved && resolved.toLowerCase() !== extracted.toLowerCase()) {
    return resolved;
  }
  return raw;
}

function extractPrimaryRecipientEmail(originalTo) {
  const normalized = normalizeTo(originalTo);
  if (!normalized) return null;
  const first = normalized.split(',')[0].trim();
  const email = extractEmailFromRaw(first);
  return email.includes('@') ? email.toLowerCase() : null;
}

/** Resolve platform user for audit (login email, role, tenant) from a raw To address. */
async function lookupRecipientAudit({ originalTo, recipientUserId }) {
  const extractedLogin = extractPrimaryRecipientEmail(originalTo);

  if (recipientUserId) {
    const r = await query(
      `SELECT id, email, role, tenant_id,
              TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name
       FROM users WHERE id = $1::uuid LIMIT 1`,
      [recipientUserId],
    );
    const u = r.rows[0];
    if (u) {
      return {
        recipientLoginEmail: (u.email || extractedLogin || '').toLowerCase() || null,
        recipientUserId: u.id,
        recipientRole: u.role || null,
        recipientTenantId: u.tenant_id || null,
        recipientName: (u.name || '').trim() || null,
      };
    }
  }

  if (!extractedLogin) {
    return {
      recipientLoginEmail: null,
      recipientUserId: null,
      recipientRole: null,
      recipientTenantId: null,
      recipientName: null,
    };
  }

  const r = await query(
    `SELECT id, email, role, tenant_id,
            TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name
     FROM users
     WHERE LOWER(email) = $1
        OR LOWER(NULLIF(TRIM(communication_email), '')) = $1
     LIMIT 1`,
    [extractedLogin],
  );
  const u = r.rows[0];
  if (!u) {
    return {
      recipientLoginEmail: extractedLogin,
      recipientUserId: null,
      recipientRole: null,
      recipientTenantId: null,
      recipientName: null,
    };
  }
  return {
    recipientLoginEmail: (u.email || extractedLogin).toLowerCase(),
    recipientUserId: u.id,
    recipientRole: u.role || null,
    recipientTenantId: u.tenant_id || null,
    recipientName: (u.name || '').trim() || null,
  };
}

/**
 * @param {object} row
 */
async function persistMailDeliveryLog(row) {
  try {
    const audit = await lookupRecipientAudit({
      originalTo: row.originalTo,
      recipientUserId: row.recipientUserId,
    });
    const afterCommunicationTo = row.afterCommunicationTo
      ? normalizeTo(row.afterCommunicationTo).slice(0, 2000)
      : null;
    await query(
      `INSERT INTO mail_delivery_logs (
        context, status, skip_reason, original_to, after_communication_to, resolved_to,
        subject_truncated, error_message, error_code, message_id, smtp_response, user_id,
        recipient_login_email, recipient_user_id, recipient_role, recipient_tenant_id, recipient_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::uuid, $13, $14::uuid, $15, $16::uuid, $17)`,
      [
        row.context || 'unspecified',
        row.status,
        row.skipReason || null,
        row.originalTo ? normalizeTo(row.originalTo).slice(0, 2000) : null,
        afterCommunicationTo,
        row.resolvedTo ? normalizeTo(row.resolvedTo).slice(0, 2000) : null,
        row.subject ? String(row.subject).slice(0, 500) : null,
        row.errorMessage ? String(row.errorMessage).slice(0, 4000) : null,
        row.errorCode ? String(row.errorCode).slice(0, 100) : null,
        row.messageId ? String(row.messageId).slice(0, 500) : null,
        row.smtpResponse ? String(row.smtpResponse).slice(0, 2000) : null,
        row.userId || null,
        audit.recipientLoginEmail,
        audit.recipientUserId,
        audit.recipientRole,
        audit.recipientTenantId,
        audit.recipientName,
      ],
    );
  } catch (e) {
    console.warn('[mail] persistMailDeliveryLog failed (non-fatal):', e.message);
  }
}

/** Subject line for new-student account email (form + CSV import). */
export const STUDENT_WELCOME_SUBJECT = 'Your PlacementHub Account is Ready';

/**
 * Plain-text body for new student welcome (temporary password + system ID).
 * @param {{ firstName?: string | null, email: string, tempPass: string, systemId: string }} p
 */
export function studentWelcomeEmailBody({ firstName, email, tempPass, systemId, collegeName }) {
  const fn = (firstName && String(firstName).trim()) || 'Student';
  const campus = collegeName ? ` at ${collegeName}` : '';
  return (
    `Hello ${fn},\n\n` +
    `Your college has added you to PlacementHub${campus}. Student self-registration is not used — your profile details come from the campus master list.\n\n` +
    `Sign in at the PlacementHub login page with:\n` +
    `  Login email: ${email}\n` +
    `  Password: ${tempPass}\n\n` +
    `You may keep this password; changing it is optional.\n\n` +
    `Roll / system ID: ${systemId}\n\n` +
    `If you did not expect this message, contact your placement office.\n\n` +
    `Best regards,\nPlacementHub Team`
  );
}

/**
 * Welcome email to the student's login address and a copy to the platform notification inbox (YOPmail in demo).
 * @param {{ loginEmail: string, firstName?: string, tempPass: string, systemId: string, collegeName?: string, userId?: string }} p
 */
export async function sendStudentWelcomeEmails(p) {
  const { loginEmail, firstName, tempPass, systemId, collegeName, userId } = p;
  const text = studentWelcomeEmailBody({
    firstName,
    email: loginEmail,
    tempPass,
    systemId,
    collegeName,
  });
  const platform = await getPlatformSettings();
  const yopInbox = String(platform?.systemNotificationInboxEmail || '').trim();

  await sendMail({
    to: loginEmail,
    subject: STUDENT_WELCOME_SUBJECT,
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
    await sendMail({
      to: yopInbox,
      subject: `[Student welcome] ${loginEmail} — ${STUDENT_WELCOME_SUBJECT}`,
      text: copyText,
      context: 'student_welcome_yop_copy',
      userId,
      skipRecipientRedirect: true,
      skipCommunicationRouting: true,
    });
  }
}

export const PASSWORD_RESET_SUBJECT = '[PlacementHub] Reset your password';

/**
 * @param {{ firstName?: string | null, resetLink: string }} p
 */
export function passwordResetEmailBodies({ firstName, resetLink }) {
  const fn = (firstName && String(firstName).trim()) || 'there';
  const text =
    `Hi ${fn},\n\n` +
    `Click the link below to reset your PlacementHub password:\n\n` +
    `${resetLink}\n\n` +
    `This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.`;
  const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f3f4f6; padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <h2 style="margin: 0; color: #1f2937;">Password Reset Request</h2>
        </div>
        <div style="padding: 20px;">
          <p>Hi ${fn},</p>
          <p>We received a request to reset your PlacementHub password. Click the button below to choose a new password.</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; margin-bottom: 15px;">Reset Password</a>
          <p>This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    `;
  return { text, html };
}

/**
 * Password reset to the user's login email plus a demo inbox copy (YOPmail when configured).
 * @param {{ loginEmail: string, firstName?: string | null, resetLink: string, userId?: string }} p
 */
export async function sendPasswordResetEmail(p) {
  const { loginEmail, firstName, resetLink, userId } = p;
  const { text, html } = passwordResetEmailBodies({ firstName, resetLink });
  const platform = await getPlatformSettings();
  const yopInbox = String(platform?.systemNotificationInboxEmail || '').trim();

  await sendMail({
    to: loginEmail,
    subject: PASSWORD_RESET_SUBJECT,
    text,
    html,
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
    await sendMail({
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

/**
 * @param {{ to: string | string[], subject: string, text: string, html?: string, context?: string, userId?: string, recipientUserId?: string, replyTo?: string, skipCommunicationRouting?: boolean }} opts
 * @param {string} [opts.context] — audit label for logs (e.g. `guest_confirmation`, `student_welcome`)
 * @param {string} [opts.userId] — acting user who triggered the send (stored in `mail_delivery_logs.user_id`)
 * @param {string} [opts.recipientUserId] — intended recipient user when known (survives account deletion via `recipient_login_email`)
 * @param {boolean} [opts.skipCommunicationRouting] — send to `to` as-is (e.g. YOPmail disposable inbox)
 * @param {boolean} [opts.skipRecipientRedirect] — do not apply OUTBOUND_EMAIL_OVERRIDE / system inbox redirect
 */
export async function sendMail(opts) {
  const {
    context,
    userId,
    recipientUserId,
    skipCommunicationRouting,
    skipRecipientRedirect,
    replyTo,
    ...mailOpts
  } = opts;
  const logCtx = context ? `[mail:${context}]` : '[mail]';
  const originalTo = mailOpts.to;
  const platform = await getPlatformSettings();
  const from = formatFrom(platform);
  const logBase = {
    context: context || 'unspecified',
    originalTo,
    subject: mailOpts.subject,
    userId,
    recipientUserId,
  };
  if (!from) {
    console.warn(`${logCtx} skip: EMAIL_FROM / SMTP_USER not set (no From address)`);
    console.warn(`${logCtx} would-send to=%s subject=%s`, String(originalTo), mailOpts.subject);
    await persistMailDeliveryLog({
      ...logBase,
      status: 'skipped',
      skipReason: 'no_from',
      resolvedTo: null,
    });
    return { skipped: true, reason: 'no_from' };
  }

  const transport = createTransport();
  if (!transport) {
    console.warn(`${logCtx} skip: SMTP_USER / SMTP_PASS not set (no transport)`);
    console.warn(`${logCtx} would-send to=%s subject=%s`, String(originalTo), mailOpts.subject);
    await persistMailDeliveryLog({
      ...logBase,
      status: 'skipped',
      skipReason: 'no_smtp_credentials',
      resolvedTo: null,
    });
    return { skipped: true, reason: 'no_smtp_credentials' };
  }

  const afterCommunication = skipCommunicationRouting
    ? mailOpts.to
    : await routeThroughCommunicationEmails(mailOpts.to);
  const afterCommunicationTo = afterCommunication;
  if (String(normalizeTo(afterCommunication)) !== String(normalizeTo(originalTo))) {
    console.info(
      `${logCtx} routed to communication email: before=%s after=%s`,
      String(normalizeTo(originalTo)),
      String(normalizeTo(afterCommunication)),
    );
  }

  const to = resolveRecipients(afterCommunication, platform, { skipRecipientRedirect });
  const redirected =
    String(normalizeTo(afterCommunication)) !== String(Array.isArray(to) ? to.join(',') : to);
  if (redirected) {
    console.info(
      `${logCtx} recipient redirect active: beforePlatformOverride=%s resolvedTo=%s (OUTBOUND_EMAIL_OVERRIDE or systemNotificationInboxEmail)`,
      String(normalizeTo(afterCommunication)),
      String(to),
    );
  }

  const dailyLimit = await getSmtpDailyLimitState();
  if (dailyLimit.reached) {
    console.warn(
      `${logCtx} skip: daily SMTP send limit reached (%s/%s for today)`,
      dailyLimit.sentToday,
      dailyLimit.limit,
    );
    console.warn(`${logCtx} would-send to=%s subject=%s`, String(originalTo), mailOpts.subject);
    await persistMailDeliveryLog({
      ...logBase,
      status: 'skipped',
      skipReason: 'daily_limit_reached',
      afterCommunicationTo,
      resolvedTo: to,
    });
    return {
      skipped: true,
      reason: 'daily_limit_reached',
      sentToday: dailyLimit.sentToday,
      dailyLimit: dailyLimit.limit,
    };
  }

  try {
    const info = await transport.sendMail({
      from,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject: mailOpts.subject,
      text: mailOpts.text,
      html: mailOpts.html || mailOpts.text.replace(/\n/g, '<br/>'),
    });
    console.info(
      `${logCtx} sent ok to=%s subject=%s messageId=%s response=%s`,
      String(to),
      mailOpts.subject,
      info.messageId ?? '(none)',
      info.response ?? '(none)',
    );
    await persistMailDeliveryLog({
      ...logBase,
      status: 'sent',
      afterCommunicationTo,
      resolvedTo: to,
      messageId: info.messageId,
      smtpResponse: info.response,
    });
    return { sent: true, messageId: info.messageId, response: info.response };
  } catch (err) {
    const e = err && typeof err === 'object' ? err : new Error(String(err));
    console.error(`${logCtx} SEND FAILED to=%s subject=%s`, String(to), mailOpts.subject);
    console.error(`${logCtx} error: %s`, e.message);
    if (e.code) console.error(`${logCtx} code: %s`, e.code);
    if (e.command) console.error(`${logCtx} smtp command: %s`, e.command);
    if (e.response) console.error(`${logCtx} smtp response: %s`, String(e.response).slice(0, 500));
    if (e.responseCode) console.error(`${logCtx} smtp responseCode: %s`, e.responseCode);
    if (process.env.NODE_ENV === 'development' && e.stack) {
      console.error(`${logCtx} stack: %s`, e.stack.split('\n').slice(0, 8).join('\n'));
    }
    await persistMailDeliveryLog({
      ...logBase,
      status: 'failed',
      afterCommunicationTo,
      resolvedTo: to,
      errorMessage: e.message,
      errorCode: e.code != null ? String(e.code) : null,
      smtpResponse: e.response != null ? String(e.response).slice(0, 2000) : null,
    });
    throw err;
  }
}

function mailAppOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

/**
 * Mirror an in-app alert to the platform demo inbox (YOPmail when configured).
 * Does not throw — failures are logged only.
 * @param {{ title: string, message: string, type?: string, link?: string | null, audience?: string, recipientEmail?: string | null, userId?: string }} opts
 */
export async function sendInAppAlertYopCopy({
  title,
  message,
  type = 'info',
  link = null,
  audience = '',
  recipientEmail = null,
  userId,
}) {
  const platform = await getPlatformSettings();
  const yopInbox = String(platform?.systemNotificationInboxEmail || '').trim();
  if (!yopInbox) return;

  const origin = mailAppOrigin();
  const linkPath = link ? String(link).trim() : '';
  const absLink = linkPath && origin ? `${origin}${linkPath.startsWith('/') ? linkPath : `/${linkPath}`}` : linkPath;
  const subject = `[Alert] ${String(title || 'Notification').trim()}`;
  const header = [
    'Demo inbox copy — in-app alert (also visible under Alerts in PlacementHub)',
    audience ? `Audience: ${audience}` : null,
    recipientEmail ? `Recipient: ${recipientEmail}` : null,
    `Type: ${type}`,
  ]
    .filter(Boolean)
    .join('\n');

  const text = `${header}\n\n${String(title || '').trim()}\n\n${String(message || '').trim()}${absLink ? `\n\nOpen: ${absLink}` : ''}`;

  try {
    await sendMail({
      to: yopInbox,
      subject,
      text,
      context: 'in_app_alert_yop_copy',
      userId,
      recipientUserId: userId,
      skipRecipientRedirect: true,
      skipCommunicationRouting: true,
    });
  } catch (e) {
    console.error('[mail:in_app_alert_yop_copy] failed:', e.message);
  }
}
