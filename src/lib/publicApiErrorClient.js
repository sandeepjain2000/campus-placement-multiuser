/**
 * Client-safe API error utilities.
 *
 * These functions are safe to import from 'use client' components.
 * They do NOT import platformErrorLog.js, db.js, or pg.
 *
 * Server-only functions (jsonPublicError, jsonPublicErrorLogged) remain
 * in publicApiError.js which imports server-only modules.
 *
 * DO NOT add server-only imports (platformErrorLog, db, pg) to this file.
 */

/** Safe user-facing message when the server must not leak internals. */
export const GENERIC_API_ERROR = 'Something went wrong. Please try again.';

const isDev = () => process.env.NODE_ENV === 'development';

/**
 * Pick a message from a failed fetch body for UI (client components).
 * @param {{ error?: string, hint?: string } | null | undefined} body
 * @param {string} [fallback]
 */
export function clientSafeMessageFromBody(body, fallback = GENERIC_API_ERROR) {
  const err = typeof body?.error === 'string' ? body.error.trim() : '';
  const hint = typeof body?.hint === 'string' ? body.hint.trim() : '';
  if (isDev() && (err || hint)) {
    return [err, hint].filter(Boolean).join(' ') || fallback;
  }
  return fallback;
}

/** True when Postgres reports a missing table/relation (schema not migrated on this DB). */
export function isMissingDbRelation(err) {
  const code = err?.code;
  const msg = String(err?.message || '');
  return code === '42P01' || /relation .* does not exist/i.test(msg);
}

/** Strip internal/debug keys before passing API JSON to UI state or debug buffers. */
export function stripInternalApiFields(data) {
  if (!data || typeof data !== 'object') return data;
  const { hint, stack, helpAi, detail, internal, ...rest } = data;
  if (isDev()) {
    const out = { ...rest };
    if (hint) out.hint = hint;
    if (detail) out.detail = detail;
    return out;
  }
  return rest;
}
