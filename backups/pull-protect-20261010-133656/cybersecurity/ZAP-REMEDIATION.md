# Security headers & CSP remediation

Source: Lighthouse / ZAP findings against PlacementHub.

## Alerts addressed

| Alert | Risk | Fix |
|-------|------|-----|
| CSP allows `unsafe-inline` / `unsafe-eval` | Medium | Per-request nonce + `strict-dynamic` in `src/middleware.js`; production has **no** `unsafe-inline` / `unsafe-eval` on `script-src` |
| Missing HSTS | Medium | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (production) via `src/lib/securityHeaders.js` + `next.config.mjs` |
| Missing / weak frame / MIME / referrer headers | Medium | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP` |
| Cross-Domain Misconfiguration (`Access-Control-Allow-Origin: *`) | Medium | Override with app origin (not `*`) for `/_next/static` and document responses |
| Viewport blocks zoom | A11y | Root `viewport` is `width=device-width, initial-scale=1` only (no `maximumScale` / `user-scalable=no`) |

## Architecture

1. **`src/lib/securityHeaders.js`** — shared CSP + header builders.
2. **`src/middleware.js`** — generates a fresh nonce per request, sets `x-nonce` + request/response CSP so Next.js can stamp framework scripts.
3. **`next.config.mjs`** — non-CSP security headers on all routes; baseline CSP (no nonce) only on `/_next/static/*` so it does not AND with the document CSP.
4. **`src/app/layout.js`** — theme boot script uses `nonce={…}` from `headers().get('x-nonce')`.

`style-src-attr 'unsafe-inline'` remains so React `style={{…}}` props keep working (not executable JS).

`Cross-Origin-Embedder-Policy` is **not** set: `require-corp` would break common HTTPS media (S3 / storage) without CORP on those origins.

## After deploy

```powershell
curl.exe -sI "https://campus-placement-omega.vercel.app/" | findstr /I "content-security strict-transport x-frame x-content referrer cross-origin permissions"
curl.exe -sI "https://campus-placement-omega.vercel.app/_next/static/chunks/webpack.js" | findstr /I "access-control content-security"
```

Expect:
- `Content-Security-Policy` with `nonce-…` and **without** `unsafe-inline` / `unsafe-eval` on document responses
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `Access-Control-Allow-Origin: https://…` (not `*`) on static chunks

## Remaining (platform / CDN)

- Confirm HSTS preload eligibility at [hstspreload.org](https://hstspreload.org) if submitting the domain.
- CDN / Vercel project: ensure custom domains terminate TLS and do not strip security headers.
- Optional: add `Content-Security-Policy-Report-Only` + a reporting endpoint before further tightening `connect-src` / `img-src`.
