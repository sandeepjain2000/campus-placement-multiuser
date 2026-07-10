/**
 * Unique display names for colleges (tenants) and employers (company_name).
 */

export function normalizeOrganizationName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function organizationNameKey(name) {
  return normalizeOrganizationName(name).toLowerCase();
}

const NAME_KEY_SQL = `LOWER(REGEXP_REPLACE(TRIM(name), '\\s+', ' ', 'g'))`;
const COMPANY_KEY_SQL = `LOWER(REGEXP_REPLACE(TRIM(company_name), '\\s+', ' ', 'g'))`;

function getQueryExecutor(client) {
  return typeof client === 'function' ? client : client.query.bind(client);
}

export async function assertCollegeNameAvailable(client, name, options = {}) {
  const { excludeTenantId } = options;
  const normalized = normalizeOrganizationName(name);
  if (!normalized) {
    const err = new Error('COLLEGE_NAME_REQUIRED');
    throw err;
  }

  const key = organizationNameKey(normalized);
  const q = getQueryExecutor(client);
  const res = await q(
    `SELECT id, name
     FROM tenants
     WHERE type = 'college'
       AND ${NAME_KEY_SQL} = $1
       AND ($2::uuid IS NULL OR id != $2::uuid)
     LIMIT 1`,
    [key, excludeTenantId || null],
  );

  if (res.rows.length) {
    const err = new Error('COLLEGE_NAME_EXISTS');
    err.existing = res.rows[0];
    throw err;
  }
}

export async function assertEmployerNameAvailable(client, name, options = {}) {
  const { excludeEmployerId } = options;
  const normalized = normalizeOrganizationName(name);
  if (!normalized) {
    const err = new Error('EMPLOYER_NAME_REQUIRED');
    throw err;
  }

  const key = organizationNameKey(normalized);
  const q = getQueryExecutor(client);
  const res = await q(
    `SELECT id, company_name
     FROM employer_profiles
     WHERE ${COMPANY_KEY_SQL} = $1
       AND ($2::uuid IS NULL OR id != $2::uuid)
     LIMIT 1`,
    [key, excludeEmployerId || null],
  );

  if (res.rows.length) {
    const err = new Error('EMPLOYER_NAME_EXISTS');
    err.existing = res.rows[0];
    throw err;
  }
}

export function formatCollegeNameInUseMessage(existing, { name } = {}) {
  const label = name || existing?.name || 'This college name';
  return `${label} is already used by another college. Choose a different name or contact support if this is your institution.`;
}

export function formatEmployerNameInUseMessage(existing, { name } = {}) {
  const label = name || existing?.company_name || 'This company name';
  return `${label} is already registered to another employer account. Use a different company name or sign in to the existing account.`;
}
