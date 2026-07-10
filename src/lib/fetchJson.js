/**
 * Parse JSON from a fetch response; tolerate non-JSON error bodies (HTML, plain text).
 * @param {string} url
 * @param {RequestInit} [init]
 */
export async function fetchJson(url, init = {}) {
  let res;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }
  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error) errorMessage = String(errorData.error);
    } catch {
      if (res.statusText) errorMessage = `${errorMessage}: ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

/** SWR-compatible fetcher for same-origin authenticated API routes. */
export function swrFetcher(url) {
  return fetchJson(url, { credentials: 'same-origin' });
}
