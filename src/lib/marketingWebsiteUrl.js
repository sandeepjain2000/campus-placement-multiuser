const MAX_LEN = 2048;

/**
 * Normalize optional public marketing / brochure site URL from admin settings.
 * @param {unknown} raw
 * @returns {string} trimmed https URL or '' if unset/invalid
 */
export function normalizeMarketingWebsiteUrl(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  let u = s;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  if (u.length > MAX_LEN) return '';
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return u.replace(/\/$/, '');
  } catch {
    return '';
  }
}
