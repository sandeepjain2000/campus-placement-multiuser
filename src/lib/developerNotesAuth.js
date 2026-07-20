/** HttpOnly cookie set after successful unlock. */
export const DEV_NOTES_COOKIE = 'ph_dev_notes_auth';

/** Session lifetime (7 days). */
export const DEV_NOTES_SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;

/**
 * Bcrypt hash for the developer-notes gate password.
 * Override in production via DEVELOPER_NOTES_PASSWORD_HASH (never store plaintext).
 */
export const DEV_NOTES_PASSWORD_HASH =
  process.env.DEVELOPER_NOTES_PASSWORD_HASH ||
  '$2b$12$OocdTDGqmPUhuC36skoLH.ce.dDtzhHrFzBRVG4N4/S39EJXgInF6';

export function getDevNotesAuthSecret() {
  return (
    process.env.DEVELOPER_NOTES_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'developer-notes-auth-secret-change-me'
  );
}

export function isDeveloperNotesPath(pathname) {
  return pathname === '/developer' || pathname.startsWith('/developer/');
}

export function isDataEntryPath(pathname) {
  return pathname === '/data-entry' || pathname.startsWith('/data-entry/');
}

/** Developer notes + legacy data-entry hub — same team password gate. */
export function isPasswordGatedInternalPath(pathname) {
  return isDeveloperNotesPath(pathname) || isDataEntryPath(pathname);
}

export function isDeveloperNotesPublicPath(pathname) {
  return pathname === '/developer/unlock';
}

/** @returns {boolean} true when unlock cookie is required before serving the page */
export function requiresDevNotesUnlock(pathname) {
  return isPasswordGatedInternalPath(pathname) && !isDeveloperNotesPublicPath(pathname);
}

function bytesToBase64Url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arr)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  let binary = '';
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacBase64Url(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Signed session token: `<expUnix>.<hmac>` */
export async function createDevNotesSessionToken(secret = getDevNotesAuthSecret()) {
  const exp = Math.floor(Date.now() / 1000) + DEV_NOTES_SESSION_MAX_AGE_SEC;
  const payload = String(exp);
  const sig = await hmacBase64Url(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifyDevNotesSessionToken(token, secret = getDevNotesAuthSecret()) {
  if (!token || !secret) return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacBase64Url(payload, secret);
  return timingSafeEqual(sig, expected);
}


export function devNotesCookieOptions() {
  // Prefer Secure on HTTPS hosts (Vercel). Avoid Secure on plain local http even if NODE_ENV=production.
  const vercelHttps = Boolean(process.env.VERCEL);
  const secure = vercelHttps || process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: DEV_NOTES_SESSION_MAX_AGE_SEC,
  };
}
