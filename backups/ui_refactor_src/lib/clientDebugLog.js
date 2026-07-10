/**
 * In-browser debug log (localStorage + downloadable .txt). No secrets.
 */

const STORAGE_KEY = 'placementhub_client_debug_log';
const MAX_ENTRIES = 300;

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

/**
 * @param {Record<string, unknown>} entry
 */
export function appendClientDebugLog(entry) {
  if (typeof window === 'undefined') return;

  const line = {
    t: new Date().toISOString(),
    ...entry,
  };

  let buf = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
  if (!Array.isArray(buf)) buf = [];
  buf.push(line);
  while (buf.length > MAX_ENTRIES) buf.shift();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buf));
  } catch {
    /* quota or private mode */
  }
}

export function getClientDebugLogLines() {
  if (typeof window === 'undefined') return [];
  const buf = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
  return Array.isArray(buf) ? buf : [];
}

export function formatClientDebugLogText() {
  const lines = getClientDebugLogLines();
  const header = [
    'PlacementHub client debug log',
    `Exported: ${new Date().toISOString()}`,
    `Origin: ${typeof window !== 'undefined' ? window.location.origin : ''}`,
    `Path: ${typeof window !== 'undefined' ? window.location.pathname : ''}`,
    `UA: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
    `App version: ${process.env.NEXT_PUBLIC_APP_VERSION || '?'}`,
    `Build time (UTC): ${process.env.NEXT_PUBLIC_BUILD_TIME || '?'}`,
    `Git SHA: ${process.env.NEXT_PUBLIC_APP_GIT_SHA || '—'}`,
    `Vercel env: ${process.env.NEXT_PUBLIC_VERCEL_ENV || '—'}`,
    `Deployment id (unique per deploy): ${process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID || '—'}`,
    '---',
  ].join('\n');
  const body = lines.map((l) => JSON.stringify(l)).join('\n');
  return `${header}\n${body}\n`;
}

export function downloadClientDebugLog() {
  if (typeof window === 'undefined') return;
  const text = formatClientDebugLogText();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `placementhub-debug-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
