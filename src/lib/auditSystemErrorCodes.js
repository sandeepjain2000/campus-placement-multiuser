/**
 * Stable system-defined codes for Audit Reports failures (platform_error_logs.error_code).
 * Distinct from per-incident [Ref: XXXXXXXX] support references.
 */
export const AUDIT_SYSTEM_ERROR_CODES = Object.freeze({
  ROUTE_MISSING: 'PH-AUDIT-404',
  LOAD_FAILED: 'PH-AUDIT-LOAD',
  UNAVAILABLE: 'PH-AUDIT-UNAVAIL',
  MIGRATION: 'PH-AUDIT-MIGRATE',
  NETWORK: 'PH-AUDIT-NET',
  UNAUTHORIZED: 'PH-AUDIT-401',
  EXPORT_UNAVAILABLE: 'PH-AUDIT-EXPORT',
});

/** Pick a system code from HTTP status / soft-failure kind. */
export function auditSystemErrorCode({ statusCode = null, needsMigration = false, network = false } = {}) {
  if (needsMigration) return AUDIT_SYSTEM_ERROR_CODES.MIGRATION;
  if (network || statusCode === 0) return AUDIT_SYSTEM_ERROR_CODES.NETWORK;
  if (statusCode === 401) return AUDIT_SYSTEM_ERROR_CODES.UNAUTHORIZED;
  if (statusCode === 404) return AUDIT_SYSTEM_ERROR_CODES.ROUTE_MISSING;
  if (statusCode === 503) return AUDIT_SYSTEM_ERROR_CODES.UNAVAILABLE;
  return AUDIT_SYSTEM_ERROR_CODES.LOAD_FAILED;
}
