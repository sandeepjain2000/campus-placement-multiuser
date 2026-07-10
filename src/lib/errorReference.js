/**
 * Shared error reference formatting (safe for client + server).
 * References map to rows in platform_error_logs for support lookup.
 */

/** @param {string | null | undefined} id */
export function formatErrorReference(id) {
  if (!id) return null;
  return String(id).replace(/-/g, '').slice(0, 8).toUpperCase();
}

/**
 * Append a support reference code to a user-visible message.
 * @param {string} message
 * @param {{ reference?: string | null; referenceId?: string | null }} [payload]
 */
export function appendErrorReference(message, payload = {}) {
  const text = String(message || '').trim() || 'Something went wrong';
  const ref = payload.reference || formatErrorReference(payload.referenceId);
  if (!ref) return text;
  if (text.includes(`[Ref: ${ref}]`) || text.includes(`Reference: ${ref}`)) return text;
  return `${text} [Ref: ${ref}]`;
}

/**
 * Extract the best user-facing message from an API error JSON body.
 * @param {Record<string, unknown> | null | undefined} body
 * @param {string} [fallback]
 */
export function errorMessageFromApiBody(body, fallback = 'Request failed') {
  const msg =
    (typeof body?.userMessage === 'string' && body.userMessage)
    || (typeof body?.error === 'string' && body.error)
    || fallback;
  return appendErrorReference(msg, body || {});
}
