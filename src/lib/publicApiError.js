import { NextResponse } from 'next/server';
import { buildPlatformErrorResponse, inferApiErrorContext } from '@/lib/platformErrorLog';

/** Safe user-facing message when the server must not leak internals. */
export const GENERIC_API_ERROR = 'Something went wrong. Please try again.';

const isDev = () => process.env.NODE_ENV === 'development';

/**
 * JSON error for API routes — never includes migration paths, stack, or env hints in production.
 * @param {string} message
 * @param {number} [status]
 */
export function jsonPublicError(message, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Log full detail to platform_error_logs; return a safe body to the browser.
 * @param {unknown} err
 * @param {string} logLabel
 * @param {string} [publicMessage]
 * @param {number} [status]
 * @param {{ request?: Request; context?: string }} [opts]
 */
export async function jsonPublicErrorLogged(
  err,
  logLabel,
  publicMessage = GENERIC_API_ERROR,
  status = 500,
  opts = {},
) {
  console.error(logLabel, err);
  const wrapped = err instanceof Error ? err : new Error(String(err || publicMessage));
  if (!wrapped.statusCode) wrapped.statusCode = status;

  const context =
    opts.context
    || (opts.request ? inferApiErrorContext(new URL(opts.request.url).pathname, opts.request.method) : null)
    || logLabel.replace(/[^\w]+/g, '_').slice(0, 80);

  const { status: resolvedStatus, body } = await buildPlatformErrorResponse(wrapped, {
    context,
    request: opts.request,
    defaultMessage: publicMessage,
  });

  return NextResponse.json(body, { status: resolvedStatus || status });
}

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
