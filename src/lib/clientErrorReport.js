/** Bridge window-level errors into Session Diagnostics toasts. */

let reportFn = null;

const IGNORE_PATTERNS = [
  /^ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Loading CSS chunk/i,
  /Loading chunk [\d]+ failed/i,
];

export function registerClientErrorReporter(fn) {
  reportFn = typeof fn === 'function' ? fn : null;
}

export function reportClientError(message, meta = null) {
  const text = String(message || 'Unexpected error').trim() || 'Unexpected error';
  if (IGNORE_PATTERNS.some((re) => re.test(text))) return;
  if (reportFn) {
    reportFn(text, 'error', 12000, meta);
    return;
  }
  console.error('[client-error]', text, meta || '');
}
