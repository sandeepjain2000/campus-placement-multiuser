/**
 * Parse JSON from a fetch response; tolerate non-JSON error bodies (HTML, plain text).
 * Failed requests are reported to platform_error_logs when the server did not already log them.
 * @param {string} url
 * @param {RequestInit} [init]
 */
import { reportClientApiFailure, clientErrorMessage } from '@/lib/clientPlatformErrorReport';
import { formatErrorReference } from '@/lib/errorReference';

function routeFromUrl(url) {
  try {
    if (typeof url === 'string' && url.startsWith('http')) {
      return new URL(url).pathname;
    }
  } catch {
    // ignore
  }
  return String(url || '').split('?')[0] || null;
}

export async function fetchJson(url, init = {}) {
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    const message = 'Network error. Check your connection and try again.';
    const ref = await reportClientApiFailure({
      context: 'client_fetch_network',
      route: routeFromUrl(url),
      message,
      severity: 'error',
      errorCode: 'PH-CLIENT-NETWORK',
    });
    const err = new Error(ref ? `${message} [Ref: ${ref}]` : message);
    throw err;
  }

  if (!res.ok) {
    let errorData = {};
    try {
      errorData = await res.json();
    } catch {
      errorData = {};
    }

    const baseMessage =
      (typeof errorData?.error === 'string' && errorData.error)
      || (typeof errorData?.userMessage === 'string' && errorData.userMessage)
      || (res.statusText ? `Request failed (${res.status}): ${res.statusText}` : `Request failed (${res.status})`);

    const existingRef =
      errorData?.reference
      || formatErrorReference(errorData?.referenceId);
    const ref = existingRef || await reportClientApiFailure({
      context: 'client_fetch_http',
      route: routeFromUrl(url),
      statusCode: res.status,
      message: baseMessage,
      responseBody: errorData,
      severity: res.status >= 500 || res.status === 404 ? 'error' : 'warning',
      errorCode: errorData?.errorCode || (res.status === 404 ? 'PH-HTTP-404' : null),
      details: { httpStatus: res.status, source: 'fetchJson' },
    });

    const errorMessage = existingRef
      ? clientErrorMessage(baseMessage, errorData)
      : (ref ? `${String(baseMessage).replace(/\s*\[Ref:[^\]]+\]/g, '').trim()} [Ref: ${ref}]` : baseMessage);
    const err = new Error(errorMessage);
    err.status = res.status;
    err.responseBody = errorData;
    err.reference = ref || existingRef || null;
    throw err;
  }

  return res.json();
}

/** SWR-compatible fetcher for same-origin authenticated API routes. */
export function swrFetcher(url) {
  return fetchJson(url, { credentials: 'same-origin' });
}
