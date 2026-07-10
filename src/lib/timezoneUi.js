/**
 * IANA zone aliases that should be collapsed to the canonical ID in UI and stored values.
 * (e.g. older OS/browser lists still expose Asia/Calcutta; the canonical zone is Asia/Kolkata.)
 */
const CANONICAL_TIMEZONE_ID = {
  'Asia/Calcutta': 'Asia/Kolkata',
};

/**
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function canonicalizeTimezoneId(id) {
  if (id == null || id === '') return 'UTC';
  const s = String(id).trim();
  return CANONICAL_TIMEZONE_ID[s] || s;
}

/**
 * Deduplicate after canonicalization and sort for select options.
 * @param {readonly string[]} rawIds
 * @returns {string[]}
 */
export function buildSortedTimezoneIds(rawIds) {
  const seen = new Set();
  const out = [];
  for (const raw of rawIds) {
    const id = canonicalizeTimezoneId(raw);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}
