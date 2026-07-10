/**
 * Client-side debug logger.
 *
 * Reads the `placementhub_debug` localStorage flag.
 * When enabled:
 *   - Logs steps in memory per module.
 *   - Attaches `X-Debug-Mode: 1` header to every fetch() call via debugFetch().
 *   - Flushes accumulated steps to /api/debug/log at the end of each logical operation.
 *
 * Usage:
 *   import { clientDebugLog, flushClientDebugLog, debugFetch } from '@/lib/clientDebugLog';
 *
 *   clientDebugLog('student_apply', 'submit_clicked', { jobId });
 *   const res = await debugFetch('/api/student/program-applications', { method: 'POST', ... });
 *   clientDebugLog('student_apply', 'response_received', { status: res.status });
 *   await flushClientDebugLog('student_apply', email);
 */

const DEBUG_FLAG_KEY = 'placementhub_debug';

export function isDebugEnabled() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(DEBUG_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDebugEnabled(val) {
  try {
    if (val) localStorage.setItem(DEBUG_FLAG_KEY, '1');
    else localStorage.removeItem(DEBUG_FLAG_KEY);
  } catch { /* ignore */ }
}

// In-memory step buffer — keyed by module so parallel operations don't mix
const _buffers = {};

/**
 * Append a debug step for a module.
 * @param {string} module  e.g. 'student_apply'
 * @param {string} event   e.g. 'submit_clicked'
 * @param {unknown} data
 */
export function clientDebugLog(module, event, data = null) {
  if (!isDebugEnabled()) return;
  if (!_buffers[module]) _buffers[module] = [];
  const step = { t: new Date().toISOString(), event, data };
  _buffers[module].push(step);
  // Mirror to browser console for real-time inspection
  console.debug(`[debug:${module}]`, event, data ?? '');
}

/**
 * Same as window.fetch but injects X-Debug-Mode: 1 when debug is enabled.
 */
export function debugFetch(url, options = {}) {
  if (!isDebugEnabled()) return fetch(url, options);
  const headers = new Headers(options.headers || {});
  headers.set('x-debug-mode', '1');
  return fetch(url, { ...options, headers });
}

/**
 * Flush accumulated steps for a module to the server, then clear the buffer.
 * @param {string} module
 * @param {string|null} email  Actor email for correlation
 */
export async function flushClientDebugLog(module, email = null) {
  if (!isDebugEnabled()) return;
  const steps = _buffers[module] || [];
  _buffers[module] = [];
  if (!steps.length) return;

  try {
    await fetch('/api/debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module,
        email,
        steps,
        userAgent: navigator.userAgent,
        sessionId: `cdbg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }),
    });
  } catch (e) {
    console.error('[clientDebugLog] flush failed', e);
  }
}

// --- Original local-storage file-download client debug log implementation ---
const STORAGE_KEY = 'placementhub_client_debug_log';
const MAX_ENTRIES = 300;

function safeJsonParse(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

export function appendClientDebugLog(entry) {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV === 'production') return;

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
