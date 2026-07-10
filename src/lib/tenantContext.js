/** 8-4-4-4-12 hex form accepted by PostgreSQL `uuid` (seed data may use non-RFC version/variant nibbles). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/** Tenant id from JWT/session user only — never guess from DB. */
export function getSessionTenantId(user) {
  if (!user) return null;
  const id = user.tenantId ?? user.tenant_id ?? null;
  return id && String(id).trim() ? String(id).trim() : null;
}
