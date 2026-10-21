/** Shared app origin for absolute links in emails. */
export function appOrigin() {
  const u = process.env.NEXTAUTH_URL;
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL;
  if (v) return (v.startsWith('http') ? v : `https://${v}`).replace(/\/$/, '');
  return '';
}

/** Browser redirects use the public origin. A local NEXTAUTH_URL keeps the request host. */
export function publicRedirectUrl(path, requestUrl) {
  const configured = appOrigin();
  try {
    const host = new URL(configured).hostname.toLowerCase();
    if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
      return new URL(path, configured);
    }
  } catch {
    /* use the request host */
  }
  return new URL(path, requestUrl);
}
