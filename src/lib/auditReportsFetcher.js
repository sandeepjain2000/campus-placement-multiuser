import { stripInternalApiFields } from '@/lib/publicApiErrorClient';
import { reportClientApiFailure } from '@/lib/clientPlatformErrorReport';
import { PLATFORM_ERROR_CONTEXT } from '@/lib/platformErrorContext';
import { appendErrorReference } from '@/lib/errorReference';
import { auditSystemErrorCode } from '@/lib/auditSystemErrorCodes';

/** Predefined client messages — never surface raw HTTP status codes. */
export const AUDIT_CLIENT_ERRORS = Object.freeze({
  LOAD_FAILED: 'Audit data could not be loaded. Please try again.',
  NETWORK: 'We could not reach the server. Check your connection and try again.',
  UNAUTHORIZED: 'You do not have permission to view audit data.',
  UNAVAILABLE: 'Audit log entries could not be loaded right now. Please try again.',
  MIGRATION_REQUIRED:
    'Audit log storage is not available on this environment. Ask your administrator to finish setup.',
});

const KNOWN = new Set(Object.values(AUDIT_CLIENT_ERRORS));

function friendlyAuditError(raw, status) {
  const msg = String(raw || '').trim();
  // Strip any existing [Ref: …] when matching known messages.
  const withoutRef = msg.replace(/\s*\[Ref:\s*[A-Z0-9]+\]\s*$/i, '').trim();
  if (withoutRef && KNOWN.has(withoutRef)) return withoutRef;
  if (msg && KNOWN.has(msg)) return msg;
  if (/migration|storage is not available|not set up/i.test(msg)) {
    return AUDIT_CLIENT_ERRORS.MIGRATION_REQUIRED;
  }
  if (status === 401) return AUDIT_CLIENT_ERRORS.UNAUTHORIZED;
  if (status === 0 || Number.isNaN(Number(status))) return AUDIT_CLIENT_ERRORS.NETWORK;
  return AUDIT_CLIENT_ERRORS.LOAD_FAILED;
}

function emptyPayloadForUrl(url) {
  const path = String(url || '');
  if (path.includes('/api/audit/log-entries') || path.includes('/api/audit/logs')) {
    return { logs: [], unavailable: true };
  }
  if (path.includes('/api/audit/reports')) {
    return { exports: [], unavailable: true };
  }
  if (path.includes('/api/admin/colleges')) {
    return { colleges: [] };
  }
  return {};
}

function auditErrorContext(url) {
  const path = String(url || '');
  if (path.includes('/api/audit/reports')) return PLATFORM_ERROR_CONTEXT.AUDIT_REPORTS;
  return PLATFORM_ERROR_CONTEXT.AUDIT_LOG_ENTRIES;
}

/**
 * Persist to platform_error_logs and return the support reference when created.
 * Skips insert if the response already includes a reference.
 */
async function reportAuditClientFailure(url, statusCode, message, responseBody = null, extra = {}) {
  const errorCode =
    responseBody?.errorCode
    || auditSystemErrorCode({
      statusCode,
      needsMigration: extra.needsMigration,
      network: statusCode === 0,
    });
  const ref = await reportClientApiFailure({
    context: auditErrorContext(url),
    route: String(url || '').split('?')[0],
    statusCode,
    message,
    responseBody,
    errorCode,
    // Missing routes never hit a server handler — elevate so they appear as errors.
    severity: statusCode === 404 || statusCode === 0 || statusCode == null ? 'error' : undefined,
  });
  return {
    reference: ref || responseBody?.reference || null,
    errorCode,
  };
}

function withAuditErrorMeta(base, message, meta) {
  return {
    ...base,
    error: appendErrorReference(message, { reference: meta?.reference }),
    ...(meta?.reference ? { reference: meta.reference } : {}),
    ...(meta?.errorCode ? { errorCode: meta.errorCode } : {}),
  };
}

/**
 * SWR fetcher for audit pages — never throws (avoids runtime error text on screen).
 * Always attaches a system error code + [Ref: …] when a failure is logged.
 */
export async function auditReportsFetcher(url) {
  try {
    let res;
    try {
      res = await fetch(url, { credentials: 'include' });
    } catch {
      const error = AUDIT_CLIENT_ERRORS.NETWORK;
      const meta = await reportAuditClientFailure(url, 0, error, null, { network: true });
      return withAuditErrorMeta(emptyPayloadForUrl(url), error, meta);
    }
    let data = {};
    try {
      data = stripInternalApiFields(await res.json());
    } catch {
      data = {};
    }
    if (!res.ok) {
      const error = friendlyAuditError(data.error, res.status);
      const meta = await reportAuditClientFailure(url, res.status, error, data);
      return withAuditErrorMeta(emptyPayloadForUrl(url), error, meta);
    }
    if (data?.unavailable) {
      const error = friendlyAuditError(data.error, 503);
      const needsMigration = error === AUDIT_CLIENT_ERRORS.MIGRATION_REQUIRED;
      // Server soft-failure may already have written a log + reference; report only if not.
      const meta = await reportAuditClientFailure(url, 503, error, data, { needsMigration });
      return withAuditErrorMeta(
        { ...data },
        error,
        {
          reference: meta.reference || data.reference || null,
          errorCode: data.errorCode || meta.errorCode,
        },
      );
    }
    return data;
  } catch {
    const error = AUDIT_CLIENT_ERRORS.LOAD_FAILED;
    const meta = await reportAuditClientFailure(url, null, error);
    return withAuditErrorMeta(emptyPayloadForUrl(url), error, meta);
  }
}
