/**
 * Shared college placement-drives list fetch (desktop + mobile).
 */

export async function fetchCollegeDrivesList(queryString = '') {
  const qs = queryString && !queryString.startsWith('?') ? `?${queryString}` : queryString;
  const res = await fetch(`/api/college/drives${qs}`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.details || json?.error || 'Failed to load college drives';
    throw new Error(msg);
  }
  return json;
}
