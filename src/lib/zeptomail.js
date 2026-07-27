/**
 * ZeptoMail REST client (primary transactional email provider).
 * Authorization: Zoho-enczapikey <send-mail-token>
 * Docs: https://www.zoho.com/zeptomail/help/api/email-sending.html
 */
import axios from 'axios';

const DEFAULT_API_URL = 'https://api.zeptomail.in/v1.1/email';

/**
 * @returns {boolean}
 */
export function isZeptoConfigured() {
  return Boolean(
    String(process.env.ZEPTOMAIL_API_KEY || '').trim()
      && String(process.env.ZEPTOMAIL_FROM_EMAIL || '').trim(),
  );
}

/**
 * @returns {{ address: string, name: string } | null}
 */
export function getZeptoFrom(platform) {
  const address = String(process.env.ZEPTOMAIL_FROM_EMAIL || '').trim();
  if (!address) return null;
  const name = String(
    process.env.ZEPTOMAIL_FROM_NAME
      || platform?.systemNotificationSenderName
      || platform?.platformName
      || 'PlacementHub',
  )
    .trim()
    .replace(/["\r\n]/g, '') || 'PlacementHub';
  return { address, name };
}

/**
 * Accept raw send-mail token or a value that already includes the Zoho prefix.
 * @param {string} apiKey
 * @returns {string}
 */
function authorizationHeader(apiKey) {
  const key = String(apiKey || '').trim();
  if (/^Zoho-enczapikey\s+/i.test(key)) return key;
  return `Zoho-enczapikey ${key}`;
}

/**
 * @param {string | string[]} to
 * @returns {{ email_address: { address: string, name?: string } }[]}
 */
function toZeptoRecipients(to) {
  const list = Array.isArray(to)
    ? to
    : String(to || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  return list.map((raw) => {
    const s = String(raw || '').trim();
    const m = s.match(/^(?:"?([^"<]*)"?\s*)?<([^<>]+@[^<>]+)>$/);
    if (m) {
      const name = String(m[1] || '').trim();
      const address = m[2].trim();
      return { email_address: name ? { address, name } : { address } };
    }
    return { email_address: { address: s } };
  });
}

/**
 * Send one transactional email via ZeptoMail HTTP API.
 * @param {{
 *   to: string | string[],
 *   subject: string,
 *   html?: string,
 *   text?: string,
 *   replyTo?: string,
 *   from?: { address: string, name?: string },
 *   platform?: object,
 * }} opts
 * @returns {Promise<{ messageId: string | null, response: string, requestId: string | null, data: unknown }>}
 */
export async function sendViaZeptoMail(opts) {
  const apiKey = String(process.env.ZEPTOMAIL_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('ZEPTOMAIL_API_KEY is not set');
  }

  const from = opts.from || getZeptoFrom(opts.platform);
  if (!from?.address) {
    throw new Error('ZEPTOMAIL_FROM_EMAIL is not set');
  }

  const html =
    opts.html
    || (opts.text ? String(opts.text).replace(/\n/g, '<br/>') : '');
  const text = opts.text ? String(opts.text) : undefined;
  if (!html && !text) {
    throw new Error('Email body is empty (html/text)');
  }

  const body = {
    from: {
      address: from.address,
      ...(from.name ? { name: from.name } : {}),
    },
    to: toZeptoRecipients(opts.to),
    subject: String(opts.subject || ''),
    ...(html ? { htmlbody: html } : {}),
    ...(text && !html ? { textbody: text } : {}),
    ...(text && html ? { textbody: text } : {}),
  };

  if (opts.replyTo) {
    const reply = String(opts.replyTo).trim();
    if (reply) {
      body.reply_to = [{ address: reply.includes('<') ? (reply.match(/<([^>]+)>/)?.[1] || reply) : reply }];
    }
  }

  const apiUrl = String(process.env.ZEPTOMAIL_API_URL || DEFAULT_API_URL).trim() || DEFAULT_API_URL;

  try {
    const res = await axios.post(apiUrl, body, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authorizationHeader(apiKey),
      },
      timeout: 30_000,
      validateStatus: () => true,
    });

    if (res.status < 200 || res.status >= 300) {
      const errPayload = res.data?.error || res.data;
      const msg =
        errPayload?.message
        || (typeof errPayload === 'string' ? errPayload : null)
        || `ZeptoMail HTTP ${res.status}`;
      const err = new Error(msg);
      err.code = errPayload?.code || `HTTP_${res.status}`;
      err.response = typeof errPayload === 'string' ? errPayload : JSON.stringify(errPayload).slice(0, 500);
      err.responseCode = res.status;
      const failRequestId =
        res.data?.request_id
        || res.data?.requestId
        || errPayload?.request_id
        || errPayload?.requestId
        || res.headers?.['x-request-id']
        || null;
      if (failRequestId) err.requestId = String(failRequestId);
      throw err;
    }

    const requestId = res.data?.request_id || res.data?.requestId || null;
    const messageId =
      requestId
      || res.data?.data?.[0]?.message_id
      || res.headers?.['x-request-id']
      || null;

    return {
      messageId: messageId ? String(messageId) : null,
      requestId: requestId ? String(requestId) : null,
      response: `zeptomail:${res.status}`,
      data: res.data,
    };
  } catch (e) {
    if (e.responseCode || e.code?.startsWith?.('HTTP_')) throw e;
    if (axios.isAxiosError?.(e)) {
      const err = new Error(e.message || 'ZeptoMail request failed');
      err.code = e.code || 'ZEPTO_NETWORK';
      err.response = e.response?.data
        ? JSON.stringify(e.response.data).slice(0, 500)
        : null;
      err.responseCode = e.response?.status || null;
      throw err;
    }
    throw e;
  }
}

/**
 * Simple ZeptoMail send helper (test/scripts). Prefer `sendMail` from `@/lib/mailer` for app mail.
 * @param {{ to: string, subject: string, html: string }} opts
 */
export async function sendEmail({ to, subject, html }) {
  return sendViaZeptoMail({ to, subject, html });
}

