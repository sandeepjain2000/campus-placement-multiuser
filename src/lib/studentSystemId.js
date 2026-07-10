import { resolveStudentRollNumber } from '@/lib/validators';

const SHORT_CODE_STOP_WORDS = new Set(['of', 'the', 'and', 'for', 'at', 'in', 'a', 'an']);

/**
 * College prefix for system IDs. Uses tenants.short_code when set; otherwise derives initials from the college name.
 */
export function resolveCollegeShortCode(shortCode, tenantName = '') {
  const code = String(shortCode || '').trim();
  if (code) return code;

  const name = String(tenantName || '').trim();
  if (!name) return 'CAMP';

  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter((w) => w.length > 1 && !SHORT_CODE_STOP_WORDS.has(w.toLowerCase()));

  if (words.length >= 2) {
    return words
      .slice(0, 5)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 12);
  }

  return (words[0] || name.replace(/[^A-Za-z0-9]/g, '')).slice(0, 12).toUpperCase() || 'CAMP';
}

/** College system ID: `{shortCode}-{roll}` when short code exists, else roll only. */
export function formatStudentSystemId(shortCode, rollNumber) {
  const roll = String(rollNumber || '').trim();
  if (!roll) return '';
  const code = String(shortCode || '').trim();
  return code ? `${code}-${roll}` : roll;
}

/** System ID for a tenant row — always `{prefix}-{roll}` (prefix from short_code or college name). */
export function formatStudentSystemIdForCollege(tenant, rollNumber) {
  const roll = String(rollNumber || '').trim();
  if (!roll) return '';
  const prefix = resolveCollegeShortCode(tenant?.short_code, tenant?.name);
  return `${prefix}-${roll}`;
}

/**
 * Resolve canonical roll + system id from CSV cells (employer uploads).
 * Accepts prefixed system id (IITM-CS2021001) or bare roll when short code is known.
 */
export function resolveRollFromCsvIdentifiers({ systemIdCell, rollCell, shortCode }) {
  const systemId = String(systemIdCell || '').trim();
  const roll = String(rollCell || '').trim();
  const code = String(shortCode || '').trim();

  if (systemId) {
    const r = resolveStudentRollNumber(systemId, code);
    if (r.error) return { error: r.error };
    return { rollNumber: r.rollNumber, systemId: r.systemId };
  }
  if (roll) {
    const r = resolveStudentRollNumber(roll, code);
    if (r.error) return { error: r.error };
    return { rollNumber: r.rollNumber, systemId: r.systemId };
  }
  return { error: 'system_id or roll_number is required' };
}
