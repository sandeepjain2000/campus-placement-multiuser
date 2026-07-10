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
