/**
 * Session security: sign-in must not survive closing the browser.
 *
 * NextAuth always attaches `Expires` / `Max-Age` from session.maxAge when it sets the
 * JWT session cookie (sign-in + /api/auth/session refresh). Omitting maxAge in
 * authOptions alone is not enough — see stripSessionCookiePersistence() and the
 * wrapped [...nextauth] route handler.
 */

const IS_PROD = process.env.NODE_ENV === 'production';
const IS_VERCEL = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1' || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));
const USE_SECURE = IS_PROD && (IS_VERCEL || (typeof window !== 'undefined' && window.location.protocol === 'https:'));
const COOKIE_PREFIX = USE_SECURE ? '__Secure-' : '';

/** Current session cookie (bump suffix when semantics change). */
export const SESSION_COOKIE_NAME = `${COOKIE_PREFIX}placementhub.session.v2`;

/** Marker in sessionStorage — set on sign-in; cleared when the browser session ends. */
export const SESSION_BROWSER_MARKER_KEY = 'placementhub_browser_session';

const SESSION_COOKIE_MATCH = 'placementhub.session';

/** Older persistent cookies to delete on every response. */
export const LEGACY_SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  `${COOKIE_PREFIX}placementhub.session`,
  'placementhub.session',
];

/** JWT `exp` claim cap while the tab stays open (cookie must be session-only). */
export const JWT_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

/**
 * Session cookie options — no maxAge/expires here; persistence is stripped again in the auth route wrapper.
 * @returns {import('next-auth').CookiesOptions['sessionToken']['options']}
 */
export function sessionTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: USE_SECURE,
  };
}

function isPlacementHubSessionCookie(setCookieLine) {
  return setCookieLine.includes(SESSION_COOKIE_MATCH);
}

function isSessionCookieDeletion(setCookieLine) {
  const pair = setCookieLine.split(';')[0] || '';
  const eq = pair.indexOf('=');
  if (eq === -1) return false;
  const value = pair.slice(eq + 1).trim();
  return value === '' || /Max-Age=0/i.test(setCookieLine);
}

/**
 * Remove Expires / Max-Age so the browser treats this as a session cookie.
 * @param {string} setCookieLine
 */
export function rewriteSessionSetCookieLine(setCookieLine) {
  if (!isPlacementHubSessionCookie(setCookieLine)) {
    return setCookieLine;
  }
  if (isSessionCookieDeletion(setCookieLine)) {
    return setCookieLine;
  }
  return setCookieLine
    .replace(/;\s*Expires=[^;]*/gi, '')
    .replace(/;\s*Max-Age=[^;]*/gi, '')
    .trim();
}

/** Call in the browser immediately after a successful sign-in (before navigation). */
export function markBrowserSessionActive() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_BROWSER_MARKER_KEY, '1');
  } catch {
    /* private mode */
  }
}

/** Set-Cookie headers that clear superseded auth cookie names. */
export function legacySessionCookieClearanceLines() {
  const secure = USE_SECURE ? '; Secure' : '';
  return LEGACY_SESSION_COOKIE_NAMES.map(
    (name) => `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
  );
}

/**
 * Apply session-only cookie policy to a NextAuth route handler response.
 * @param {Response} response
 */
export function applySessionCookiePolicy(response) {
  if (!(response instanceof Response)) {
    return response;
  }

  const headers = new Headers(response.headers);
  const setCookies =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : headers.get('set-cookie')
        ? [headers.get('set-cookie')]
        : [];

  // Remove the existing set-cookie header so we don't duplicate
  headers.delete('set-cookie');

  // Convert the remaining headers to an array of tuples
  const headerTuples = [];
  headers.forEach((value, key) => {
    headerTuples.push([key, value]);
  });

  // Add the modified and legacy cookies as separate tuples
  if (setCookies.length > 0) {
    for (const line of setCookies) {
      headerTuples.push(['Set-Cookie', rewriteSessionSetCookieLine(line)]);
    }
  }
  for (const line of legacySessionCookieClearanceLines()) {
    headerTuples.push(['Set-Cookie', line]);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headerTuples,
  });
}
