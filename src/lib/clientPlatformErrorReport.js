/**
 * Report API/UI failures to platform_error_logs when the server did not already log them.
 * Fire-and-forget — never throws to callers.
 */
import { appendErrorReference, formatErrorReference } from '@/lib/errorReference';

/**
 * @returns {Promise<string | null>} Short reference code when the server persisted a log row.
 */
export async function reportClientApiFailure({
  context,
  route,
  statusCode = null,
  message,
  details = null,
  responseBody = null,
}) {
  if (typeof window === 'undefined') return null;

  const existingRef =
    responseBody?.reference
    || formatErrorReference(responseBody?.referenceId);
  if (existingRef) return existingRef;

  const payload = {
    context,
    route,
    statusCode,
    message: message || responseBody?.userMessage || responseBody?.error || 'Request failed',
    alreadyLogged: false,
    details: details || (responseBody ? { response: responseBody } : null),
  };

  try {
    const res = await fetch('/api/platform/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    return json.reference || formatErrorReference(json.referenceId) || null;
  } catch {
    return null;
  }
}

/**
 * Message for toasts when the API body may already include a reference.
 * @param {string} message
 * @param {Record<string, unknown> | null | undefined} [responseBody]
 */
export function clientErrorMessage(message, responseBody) {
  return appendErrorReference(message, responseBody || {});
}
