import { query } from '@/lib/db';

/** Gmail free-tier safe default (500/day cap; we stay well under). */
export const DEFAULT_SMTP_DAILY_SEND_LIMIT = 30;

/**
 * Max outbound SMTP sends per calendar day (DB `CURRENT_DATE`).
 * Set `SMTP_DAILY_SEND_LIMIT=0` or `unlimited` to disable.
 */
export function getSmtpDailySendLimit() {
  const raw = process.env.SMTP_DAILY_SEND_LIMIT;
  if (raw === '0' || String(raw || '').trim().toLowerCase() === 'unlimited') {
    return null;
  }
  if (raw == null || String(raw).trim() === '') {
    return DEFAULT_SMTP_DAILY_SEND_LIMIT;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_SMTP_DAILY_SEND_LIMIT;
  }
  return Math.floor(n);
}

export async function countSmtpSentToday() {
  const r = await query(
    `SELECT COUNT(*)::int AS n
     FROM mail_delivery_logs
     WHERE status = 'sent'
       AND created_at >= CURRENT_DATE`,
  );
  return r.rows[0]?.n ?? 0;
}

/**
 * @returns {Promise<{ reached: boolean, limit: number | null, sentToday: number }>}
 */
export async function getSmtpDailyLimitState() {
  const limit = getSmtpDailySendLimit();
  if (limit == null) {
    return { reached: false, limit: null, sentToday: 0 };
  }
  const sentToday = await countSmtpSentToday();
  return {
    reached: sentToday >= limit,
    limit,
    sentToday,
  };
}
