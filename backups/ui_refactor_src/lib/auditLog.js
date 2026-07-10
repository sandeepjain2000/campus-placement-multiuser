import { query } from '@/lib/db';

/** @typedef {{ userId?: string | null, tenantId?: string | null, action: string, entityType?: string | null, entityId?: string | null, oldValues?: object | null, newValues?: object | null, ipAddress?: string | null }} AuditPayload */

const MAX_ACTION_LEN = 50;

/**
 * Best-effort audit row; never throws to callers.
 * @param {AuditPayload} payload
 */
export async function writeAuditLog(payload) {
  const action = String(payload.action || '').slice(0, MAX_ACTION_LEN);
  if (!action) return;

  try {
    await query(
      `INSERT INTO audit_logs (user_id, tenant_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES (
         $1::uuid,
         $2::uuid,
         $3,
         $4,
         $5::uuid,
         $6::jsonb,
         $7::jsonb,
         $8
       )`,
      [
        payload.userId || null,
        payload.tenantId || null,
        action,
        payload.entityType ? String(payload.entityType).slice(0, 50) : null,
        payload.entityId || null,
        payload.oldValues != null ? JSON.stringify(payload.oldValues) : null,
        payload.newValues != null ? JSON.stringify(payload.newValues) : null,
        payload.ipAddress ? String(payload.ipAddress).trim().slice(0, 45) : null,
      ],
    );
  } catch (e) {
    console.error('writeAuditLog failed:', e.message);
  }
}

/**
 * Client IP from Next.js request (Vercel / common proxies).
 * @param {Request} request
 * @returns {string | null}
 */
export function getRequestClientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim().slice(0, 45);
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim().slice(0, 45);
  return null;
}
