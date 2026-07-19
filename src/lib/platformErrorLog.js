import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import { isGuidedRunnerLoggingEnabled } from '@/lib/guidedRunnerConfig';
import { appendErrorReference, formatErrorReference } from '@/lib/errorReference';

export { formatErrorReference } from '@/lib/errorReference';

export { PLATFORM_ERROR_CONTEXT };

const MAX_STRING = 4000;
const MAX_STACK = 8000;

/** @param {unknown} value */
function truncate(value, max = MAX_STRING) {
  if (value == null) return value;
  const s = String(value);
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/** @param {unknown} body */
export function sanitizePayloadForLog(body) {
  if (body == null) return null;
  if (typeof body !== 'object') return truncate(body);
  const out = Array.isArray(body) ? [...body] : { ...body };
  if (!Array.isArray(out)) {
    for (const key of Object.keys(out)) {
      const lower = key.toLowerCase();
      if (/(password|secret|token|authorization|cookie)/i.test(lower)) {
        out[key] = '[redacted]';
        continue;
      }
      if (typeof out[key] === 'string') out[key] = truncate(out[key]);
    }
  }
  return out;
}

/** @param {Error & { code?: string; statusCode?: number; detail?: string }} | unknown} error */
export function postgresErrorHint(error) {
  const code = error?.code;
  if (code === '42703') return 'A required database column is missing — run pending migrations on the server.';
  if (code === '42P01') return 'A required database table is missing — run pending migrations on the server.';
  if (code === '23514') return 'A platform validation rule blocked this request.';
  if (code === '23503') return 'A linked record (campus, employer, or user) could not be found.';
  if (code === '23505') return 'This record conflicts with an existing entry.';
  if (code === '22P02' || code === '22007') return 'One of the submitted values has an invalid format.';
  return null;
}

function errorMessageFromUnknown(err) {
  if (err instanceof Error) return err.message || 'Unknown error';
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/** Always emit structured failure to server console (Vercel logs) when DB insert fails. */
function logPlatformFailureFallback(payload, dbErr) {
  const record = {
    context: payload.context,
    statusCode: payload.statusCode ?? null,
    severity: payload.severity || 'error',
    errorMessage: errorMessageFromUnknown(payload.error),
    userMessage: payload.userMessage || null,
    errorCode:
      payload.error && typeof payload.error === 'object' && payload.error.code != null
        ? String(payload.error.code)
        : null,
    details: payload.details || null,
    dbWriteError: dbErr?.message || null,
    dbWriteCode: dbErr?.code || null,
  };
  if (dbErr?.code === '42P01') {
    console.error(
      '[platform_error_log] platform_error_logs table missing — run db/migrations/083_platform_error_logs.sql',
      JSON.stringify(record),
    );
  } else {
    console.error('[platform_error_log] DB insert failed', JSON.stringify(record));
  }
}

/**
 * Best-effort platform error log; returns log id or null.
 * @param {{
 *   context: string;
 *   error: unknown;
 *   statusCode?: number;
 *   userMessage?: string | null;
 *   userId?: string | null;
 *   tenantId?: string | null;
 *   employerId?: string | null;
 *   errorCode?: string | null;
 *   details?: Record<string, unknown> | null;
 *   ipAddress?: string | null;
 *   severity?: 'info' | 'warning' | 'error';
 * }} payload
 */
export async function writePlatformErrorLog(payload) {
  const contextStr = String(payload.context || '');
  if (contextStr.startsWith('api_guided_runner') && !isGuidedRunnerLoggingEnabled()) {
    return null;
  }
  if (contextStr.startsWith('api_demo')) {
    return null;
  }

  const err = payload.error;
  const errorMessage = truncate(errorMessageFromUnknown(err));
  const errorCode =
    (payload.errorCode != null ? String(payload.errorCode).slice(0, 50) : null)
    || (err && typeof err === 'object' && err.code != null ? String(err.code).slice(0, 50) : null);

  const details = {
    ...(payload.details || {}),
    ...(err instanceof Error && err.stack
      ? { stack: truncate(err.stack, MAX_STACK) }
      : {}),
    ...(err && typeof err === 'object' && err.detail ? { pgDetail: truncate(err.detail) } : {}),
  };

  try {
    const res = await query(
      `INSERT INTO platform_error_logs (
         severity, context, status_code, user_id, tenant_id, employer_id,
         user_message, error_message, error_code, details, ip_address
       ) VALUES (
         $1, $2, $3, $4::uuid, $5::uuid, $6::uuid,
         $7, $8, $9, $10::jsonb, $11
       )
       RETURNING id`,
      [
        payload.severity || 'error',
        String(payload.context || 'unknown').slice(0, 80),
        payload.statusCode ?? null,
        payload.userId || null,
        payload.tenantId || null,
        payload.employerId || null,
        payload.userMessage ? truncate(payload.userMessage, 500) : null,
        errorMessage,
        errorCode,
        Object.keys(details).length ? JSON.stringify(details) : null,
        payload.ipAddress ? String(payload.ipAddress).trim().slice(0, 45) : null,
      ],
    );
    return res.rows[0]?.id || null;
  } catch (e) {
    logPlatformFailureFallback(payload, e);
    return null;
  }
}

const API_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * Stable context key from an API route path, e.g. /api/employer/drives → api_employer_drives.
 * @param {string} pathname
 * @param {string} [method]
 */
export function inferApiErrorContext(pathname, method = '') {
  const path = String(pathname || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (!path.startsWith('/api/')) return 'api_unknown';
  let slug = path
    .slice('/api/'.length)
    .replace(/\[[^\]]+\]/g, 'id')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  if (!slug) slug = 'root';
  const m = String(method || '').toUpperCase();
  const withMethod = m && API_HTTP_METHODS.has(m) ? `${slug}_${m.toLowerCase()}` : slug;
  const key = `api_${withMethod}`;
  return key.length <= 80 ? key : key.slice(0, 80);
}

/**
 * True when the JSON body already carries a platform_error_logs reference.
 * @param {Record<string, unknown> | null | undefined} body
 */
export function isAlreadyLoggedErrorBody(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.referenceId || body.reference) return true;
  const fields = [body.error, body.userMessage, body.warning];
  return fields.some(
    (v) => typeof v === 'string' && (v.includes('[Ref:') || v.includes('Reference:')),
  );
}

/**
 * Soft HTTP 2xx payloads that still represent a failed operation
 * (UI shows empty/unavailable while the real failure must hit Error logs).
 * @param {Record<string, unknown> | null | undefined} body
 */
export function isSoftApiFailureBody(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.unavailable === true) return true;
  if (body.success === false && (body.error || body.userMessage || body.warning)) return true;
  if (body.ok === false && (body.error || body.userMessage || body.warning)) return true;
  return false;
}

/**
 * Log an HTTP error response that did not already persist a platform_error_logs row.
 * Covers:
 * - 4xx/5xx JSON responses
 * - Soft HTTP 2xx failures (`unavailable`, `success: false`, etc.)
 * Attaches a support reference id when not already present.
 * @param {Request} request
 * @param {Response} response
 * @param {{ context?: string; sessionUser?: object }} [opts]
 * @returns {Promise<Response>}
 */
export async function logApiResponseIfFailure(request, response, opts = {}) {
  if (!response) return response;

  const statusCode = response.status;
  const isHardFailure = statusCode >= 400;
  if (!isHardFailure && statusCode < 200) return response;

  let body = {};
  let parsedJson = false;
  try {
    body = await response.clone().json();
    parsedJson = true;
  } catch {
    body = {};
  }

  const isSoftFailure = !isHardFailure && parsedJson && isSoftApiFailureBody(body);
  if (!isHardFailure && !isSoftFailure) return response;

  if (isAlreadyLoggedErrorBody(body)) {
    return response;
  }

  let requestUrl = null;
  try {
    requestUrl = new URL(request.url);
  } catch {
    requestUrl = null;
  }

  const context =
    opts.context
    || inferApiErrorContext(requestUrl?.pathname || '', request.method);
  const message =
    (typeof body.error === 'string' && body.error)
    || (typeof body.userMessage === 'string' && body.userMessage)
    || (typeof body.warning === 'string' && body.warning)
    || (isSoftFailure ? 'Request failed (soft failure)' : `HTTP ${statusCode}`);

  const err = new Error(message);
  err.statusCode = isSoftFailure ? (Number(body.statusCode) || 500) : statusCode;
  if (body.errorCode != null) err.code = String(body.errorCode);

  const logStatus = isSoftFailure ? (Number(body.statusCode) || 500) : statusCode;
  const referenceId = await writePlatformErrorLog({
    context,
    error: err,
    errorCode: body.errorCode != null ? String(body.errorCode) : null,
    statusCode: logStatus,
    severity: logStatus >= 500 ? 'error' : logStatus === 401 ? 'info' : 'warning',
    userId: opts.sessionUser?.id || opts.sessionUser?.sub || null,
    tenantId: opts.tenantId || null,
    employerId: opts.employerId || null,
    userMessage: message,
    ipAddress: getRequestIp(request),
    details: {
      source: isSoftFailure ? 'api_soft_failure' : 'api_response',
      softFailure: isSoftFailure || undefined,
      route: requestUrl?.pathname || null,
      requestMethod: request?.method || null,
      requestQuery: requestUrl?.search || null,
      httpStatus: statusCode,
      systemErrorCode: body.errorCode || null,
      userAgent: (request && request.headers && typeof request.headers.get === 'function')
        ? truncate(request.headers.get('user-agent'), 300)
        : null,
      responseBody: sanitizePayloadForLog(body),
      technicalMessage: message,
    },
  });

  if (!referenceId) return response;

  const ref = formatErrorReference(referenceId);
  const headers = new Headers(response.headers);
  if (!headers.get('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const baseMessage = body.userMessage || body.error || body.warning || message;
  const userMessage =
    logStatus >= 500
      ? (body.userMessage || appendErrorReference(
        [baseMessage, 'Full details were saved for the platform administrator.'].filter(Boolean).join(' '),
        { reference: ref, referenceId },
      ))
      : appendErrorReference(baseMessage, { reference: ref, referenceId });

  const nextBody = {
    ...body,
    error: body.error ? appendErrorReference(String(body.error), { reference: ref, referenceId }) : userMessage,
    userMessage,
    referenceId,
    reference: ref,
  };
  if (body.warning && typeof body.warning === 'string') {
    nextBody.warning = appendErrorReference(body.warning, { reference: ref, referenceId });
  }

  return NextResponse.json(nextBody, { status: statusCode, headers });
}

/** @param {Request} request */
export function getRequestIp(request) {
  if (!request || !request.headers || typeof request.headers.get !== 'function') {
    return null;
  }
  try {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim().slice(0, 45);
    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp.trim().slice(0, 45);
  } catch (e) {
    // ignore
  }
  return null;
}

function buildErrorBody(statusCode, rawMessage, defaultMessage, hint, referenceId) {
  const ref = formatErrorReference(referenceId);
  const baseMessage = rawMessage || defaultMessage || 'Request failed';

  // Never put schema/migration SQL hints in the user-facing payload — they belong in Error logs only.
  const isSchemaNoise =
    /column .+ does not exist/i.test(baseMessage)
    || /relation .+ does not exist/i.test(baseMessage)
    || /database column is missing/i.test(String(hint || ''))
    || /run pending migrations/i.test(String(hint || ''))
    || /run pending migrations/i.test(baseMessage);

  if (statusCode < 500) {
    const safeBase = isSchemaNoise
      ? (defaultMessage || 'Request failed')
      : baseMessage;
    const displayed = appendErrorReference(safeBase, { reference: ref, referenceId });
    const body = {
      error: displayed,
      userMessage: displayed,
    };
    if (ref) {
      body.referenceId = referenceId;
      body.reference = ref;
    }
    return body;
  }

  const base = defaultMessage || 'Something went wrong';
  const parts = [base];
  // Skip postgres schema hints in the client-visible message.
  if (hint && !isSchemaNoise && !/column is missing|table is missing|migrations/i.test(hint)) {
    parts.push(hint);
  }
  if (ref) {
    parts.push(`Reference: ${ref}. Full details were saved for the platform administrator.`);
  } else {
    parts.push('Please try again or contact support.');
  }

  return {
    error: parts.join(' '),
    userMessage: parts.join(' '),
    referenceId: referenceId || undefined,
    reference: ref || undefined,
  };
}

/**
 * Build JSON error response; persists failures (4xx except 401, all 5xx) for super admin.
 * @param {unknown} error
 * @param {{
 *   context: string;
 *   request?: Request;
 *   sessionUser?: { id?: string; sub?: string; email?: string };
 *   tenantId?: string | null;
 *   employerId?: string | null;
 *   requestBody?: unknown;
 *   defaultMessage?: string;
 * }} opts
 */
export async function buildPlatformErrorResponse(error, opts) {
  const statusCode =
    error && typeof error === 'object' && Number.isFinite(error.statusCode)
      ? Number(error.statusCode)
      : 500;
  const hint = postgresErrorHint(error);
  const rawMessage = errorMessageFromUnknown(error) || opts.defaultMessage || 'Request failed';

  const userId = opts.sessionUser?.id || opts.sessionUser?.sub || null;
  const ipAddress = opts.request ? getRequestIp(opts.request) : null;
  let requestUrl = null;
  if (opts.request) {
    try {
      requestUrl = new URL(opts.request.url);
    } catch {
      requestUrl = null;
    }
  }

  const logDetails = {
    source: 'server',
    actorEmail: opts.sessionUser?.email || null,
    requestBody: sanitizePayloadForLog(opts.requestBody),
    route: requestUrl?.pathname || null,
    requestMethod: opts.request?.method || null,
    requestQuery: requestUrl?.search || null,
    userAgent: (opts.request && opts.request.headers && typeof opts.request.headers.get === 'function')
      ? truncate(opts.request.headers.get('user-agent'), 300)
      : null,
    pgHint: hint,
  };

  let referenceId = null;
  referenceId = await writePlatformErrorLog({
      context: opts.context,
      error,
      statusCode,
      severity: statusCode >= 500 ? 'error' : statusCode === 401 ? 'info' : 'warning',
      userId,
      tenantId: opts.tenantId || null,
      employerId: opts.employerId || null,
      userMessage: statusCode >= 500 ? opts.defaultMessage || rawMessage : rawMessage,
      ipAddress,
      details: logDetails,
    });

  const body = buildErrorBody(statusCode, rawMessage, opts.defaultMessage, hint, referenceId);
  if (error && typeof error === 'object' && error.field) {
    body.field = error.field;
  }

  return {
    status: statusCode,
    body,
  };
}
