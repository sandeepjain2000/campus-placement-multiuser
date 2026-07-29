/**
 * Shared HTTP security headers + CSP builders for PlacementHub.
 * Used by next.config.mjs (static asset baseline) and src/middleware.js (per-request nonces).
 */

/**
 * @param {{ nonce?: string, isDev?: boolean }} [opts]
 * @returns {string}
 */
export function buildContentSecurityPolicy(opts = {}) {
  const isDev = opts.isDev ?? process.env.NODE_ENV !== 'production';
  const nonce = opts.nonce ? String(opts.nonce) : '';

  const scriptSrc = nonce
    ? [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...(isDev ? ["'unsafe-eval'"] : []),
      ].join(' ')
    : // Static / asset responses (no per-request nonce): no unsafe-inline / unsafe-eval.
      ["'self'", ...(isDev ? ["'unsafe-eval'"] : [])].join(' ');

  const styleSrc = nonce
    ? `'self' 'nonce-${nonce}'`
    : "'self'";

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    // React `style={{…}}` attributes (not executable JS). Keeps UI intact without script unsafe-inline.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

/**
 * Non-CSP security headers (safe on HTML and static assets).
 * @param {{ isProd?: boolean, appOrigin?: string }} [opts]
 * @returns {{ key: string, value: string }[]}
 */
export function buildSecurityHeaderList(opts = {}) {
  const isProd = opts.isProd ?? process.env.NODE_ENV === 'production';
  const appOrigin = opts.appOrigin || '';

  /** @type {{ key: string, value: string }[]} */
  const headers = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value:
        'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    // COEP omitted: require-corp breaks common HTTPS media (S3/Supabase) without CORP on those origins.
  ];

  if (isProd) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    });
  }

  if (appOrigin) {
    headers.push({ key: 'Access-Control-Allow-Origin', value: appOrigin });
  }

  return headers;
}

/**
 * Apply security headers onto a NextResponse (mutates and returns it).
 * @param {import('next/server').NextResponse} response
 * @param {{ nonce?: string, isDev?: boolean, isProd?: boolean, appOrigin?: string }} [opts]
 */
export function applySecurityHeaders(response, opts = {}) {
  const list = buildSecurityHeaderList(opts);
  for (const { key, value } of list) {
    response.headers.set(key, value);
  }
  response.headers.set(
    'Content-Security-Policy',
    buildContentSecurityPolicy({ nonce: opts.nonce, isDev: opts.isDev }),
  );
  return response;
}
