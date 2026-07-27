import nodemailer from 'nodemailer';
import { getPlatformSettings } from '@/lib/platformSettings';
import {
  TEST_ENVIRONMENT_MAIL_RECIPIENTS,
} from '@/lib/platformSettingsDefaults';
import { query } from '@/lib/db';
import { getSmtpDailyLimitState } from '@/lib/mailDailyLimit';
import { hasColumn } from '@/lib/migrationReady';
import {
  getZeptoFrom,
  isZeptoConfigured,
  sendViaZeptoMail,
} from '@/lib/zeptomail';

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
 * Resolve final recipients.
 * Test environment (platform setting) always wins — both safe inboxes, ignore provided To.
 * Else: env OUTBOUND_EMAIL_OVERRIDE → system notification inbox → original.
 * @param {string | string[]} originalTo
 * @param {Awaited<ReturnType<typeof getPlatformSettings>>} platform
 */
function resolveRecipients(originalTo, platform, { skipRecipientRedirect = false } = {}) {
  if (platform?.testEnvironment === true) {
    return [...TEST_ENVIRONMENT_MAIL_RECIPIENTS];
  }
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
    const zeptoRequestId = row.zeptomailRequestId
      ? String(row.zeptomailRequestId).slice(0, 200)
      : null;
    const includeZeptoCol = await hasColumn('mail_delivery_logs', 'zeptomail_request_id');

    if (includeZeptoCol) {
      await query(
        `INSERT INTO mail_delivery_logs (
          context, status, skip_reason, original_to, after_communication_to, resolved_to,
          subject_truncated, error_message, error_code, message_id, smtp_response, zeptomail_request_id, user_id,
          recipient_login_email, recipient_user_id, recipient_role, recipient_tenant_id, recipient_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::uuid, $14, $15::uuid, $16, $17::uuid, $18)`,
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
          zeptoRequestId,
          row.userId || null,
          audit.recipientLoginEmail,
          audit.recipientUserId,
          audit.recipientRole,
          audit.recipientTenantId,
          audit.recipientName,
        ],
      );
      return;
    }

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
        row.smtpResponse
          ? String(
              zeptoRequestId
                ? `${row.smtpResponse}|request_id=${zeptoRequestId}`
                : row.smtpResponse,
            ).slice(0, 2000)
          : zeptoRequestId
            ? `request_id=${zeptoRequestId}`
            : null,
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

/** Re-exported from React Email layer — transport remains sendMail below. */
export {
  STUDENT_WELCOME_SUBJECT,
  studentWelcomeEmailBody,
  sendStudentWelcomeEmails,
} from '@/lib/email/sendStudentWelcome';
export {
  PASSWORD_RESET_SUBJECT,
  passwordResetEmailBodies,
  sendPasswordResetEmail,
} from '@/lib/email/sendPasswordReset';

/**
 * @param {{ to: string | string[], subject: string, text: string, html?: string, context?: string, userId?: string, recipientUserId?: string, replyTo?: string, skipCommunicationRouting?: boolean }} opts
 * @param {string} [opts.context] — audit label for logs (e.g. `guest_confirmation`, `student_welcome`)
 * @param {string} [opts.userId] — acting user who triggered the send (stored in `mail_delivery_logs.user_id`)
 * @param {string} [opts.recipientUserId] — intended recipient user when known (survives account deletion via `recipient_login_email`)
 * @param {boolean} [opts.skipCommunicationRouting] — send to `to` as-is (e.g. YOPmail disposable inbox)
 * @param {boolean} [opts.skipRecipientRedirect] — do not apply OUTBOUND_EMAIL_OVERRIDE / system inbox redirect (ignored when Test environment is Yes)
 */
export async function sendMail(opts) {
  const {
    context,
    userId,
    recipientUserId,
    skipCommunicationRouting,
    skipRecipientRedirect,
    replyTo,
    ...restMailOpts
  } = opts;
  let mailOpts = restMailOpts;
  const logCtx = context ? `[mail:${context}]` : '[mail]';
  const originalTo = mailOpts.to;
  const platform = await getPlatformSettings();
  const zeptoReady = isZeptoConfigured();
  const zeptoFrom = zeptoReady ? getZeptoFrom(platform) : null;
  const gmailFrom = formatFrom(platform);
  const transport = createTransport();
  const logBase = {
    context: context || 'unspecified',
    originalTo,
    subject: mailOpts.subject,
    userId,
    recipientUserId,
  };

  if (!zeptoFrom && !gmailFrom) {
    console.warn(`${logCtx} skip: no From address (set ZEPTOMAIL_FROM_EMAIL or EMAIL_FROM / SMTP_USER)`);
    console.warn(`${logCtx} would-send to=%s subject=%s`, String(originalTo), mailOpts.subject);
    await persistMailDeliveryLog({
      ...logBase,
      status: 'skipped',
      skipReason: 'no_from',
      resolvedTo: null,
    });
    return { skipped: true, reason: 'no_from' };
  }

  if (!zeptoReady && !transport) {
    console.warn(`${logCtx} skip: no mail provider (set ZEPTOMAIL_* or SMTP_USER / SMTP_PASS)`);
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
      `${logCtx} recipient redirect active: beforePlatformOverride=%s resolvedTo=%s (%s)`,
      String(normalizeTo(afterCommunication)),
      String(Array.isArray(to) ? to.join(', ') : to),
      platform?.testEnvironment
        ? 'testEnvironment'
        : 'OUTBOUND_EMAIL_OVERRIDE or systemNotificationInboxEmail',
    );
  }

  if (platform?.testEnvironment === true) {
    const intended = String(normalizeTo(originalTo) || '(none)').slice(0, 500);
    const banner =
      `[PlacementHub Test environment]\n`
      + `Intended recipient (ignored for delivery): ${intended}\n`
      + `Delivered to: ${TEST_ENVIRONMENT_MAIL_RECIPIENTS.join(', ')}\n\n`;
    if (mailOpts.text) {
      mailOpts = { ...mailOpts, text: `${banner}${mailOpts.text}` };
    }
    if (mailOpts.html) {
      const htmlBanner =
        `<p style="font-size:12px;color:#64748b;border:1px solid #e2e8f0;padding:8px 10px;border-radius:6px;">`
        + `<strong>Test environment</strong> — intended recipient (ignored): `
        + `${intended.replace(/</g, '&lt;')}<br/>Delivered to: ${TEST_ENVIRONMENT_MAIL_RECIPIENTS.join(', ')}`
        + `</p>`;
      mailOpts = { ...mailOpts, html: `${htmlBanner}${mailOpts.html}` };
    } else if (mailOpts.text) {
      mailOpts = {
        ...mailOpts,
        html: banner.replace(/\n/g, '<br/>') + String(mailOpts.text).replace(/\n/g, '<br/>'),
      };
    }
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

  const html = mailOpts.html || (mailOpts.text ? mailOpts.text.replace(/\n/g, '<br/>') : '');
  let zeptoError = null;

  if (zeptoReady && zeptoFrom) {
    try {
      const info = await sendViaZeptoMail({
        to,
        subject: mailOpts.subject,
        html,
        text: mailOpts.text,
        replyTo,
        from: zeptoFrom,
        platform,
      });
      console.info(
        `${logCtx} sent ok via=zeptomail to=%s subject=%s messageId=%s response=%s`,
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
        zeptomailRequestId: info.requestId,
        smtpResponse: `zeptomail|${info.response}${info.requestId ? `|request_id=${info.requestId}` : ''}`,
      });
      return {
        sent: true,
        provider: 'zeptomail',
        messageId: info.messageId,
        requestId: info.requestId,
        response: info.response,
      };
    } catch (err) {
      zeptoError = err && typeof err === 'object' ? err : new Error(String(err));
      console.warn(
        `${logCtx} ZeptoMail failed (%s); falling back to Gmail SMTP if configured`,
        zeptoError.message,
      );
      if (zeptoError.code) console.warn(`${logCtx} zepto code: %s`, zeptoError.code);
      if (zeptoError.response) {
        console.warn(`${logCtx} zepto response: %s`, String(zeptoError.response).slice(0, 500));
      }
    }
  }

  if (!transport || !gmailFrom) {
    const e = zeptoError || new Error('No Gmail SMTP backup available after ZeptoMail failure');
    console.error(`${logCtx} SEND FAILED to=%s subject=%s`, String(to), mailOpts.subject);
    console.error(`${logCtx} error: %s`, e.message);
    await persistMailDeliveryLog({
      ...logBase,
      status: 'failed',
      afterCommunicationTo,
      resolvedTo: to,
      errorMessage: e.message,
      errorCode: e.code != null ? String(e.code) : 'zepto_no_gmail_fallback',
      zeptomailRequestId: e.requestId || null,
      smtpResponse: e.response != null ? String(e.response).slice(0, 2000) : null,
    });
    throw e;
  }

  try {
    const info = await transport.sendMail({
      from: gmailFrom,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject: mailOpts.subject,
      text: mailOpts.text,
      html,
    });
    const via = zeptoError ? 'gmail_smtp_fallback' : 'gmail_smtp';
    console.info(
      `${logCtx} sent ok via=%s to=%s subject=%s messageId=%s response=%s`,
      via,
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
      zeptomailRequestId: zeptoError?.requestId || null,
      smtpResponse: zeptoError
        ? `gmail_smtp_fallback|zepto_error=${String(zeptoError.message).slice(0, 200)}|${info.response ?? ''}`
        : info.response,
    });
    return {
      sent: true,
      provider: via,
      messageId: info.messageId,
      response: info.response,
      zeptoError: zeptoError ? String(zeptoError.message) : undefined,
    };
  } catch (err) {
    const e = err && typeof err === 'object' ? err : new Error(String(err));
    console.error(`${logCtx} SEND FAILED to=%s subject=%s`, String(to), mailOpts.subject);
    console.error(`${logCtx} error: %s`, e.message);
    if (zeptoError) console.error(`${logCtx} prior ZeptoMail error: %s`, zeptoError.message);
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
      errorMessage: zeptoError
        ? `zepto: ${zeptoError.message}; gmail: ${e.message}`
        : e.message,
      errorCode: e.code != null ? String(e.code) : null,
      zeptomailRequestId: zeptoError?.requestId || null,
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
