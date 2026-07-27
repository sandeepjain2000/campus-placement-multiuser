# ZAP Medium findings remediation (2026-07-22)

Source: `cybersecurity/Zap Security Report.pdf` — PlacementHub passive scan.

## Alerts addressed

| Alert | Risk | Fix |
|-------|------|-----|
| Content Security Policy (CSP) Header Not Set | Medium / High confidence | Set `Content-Security-Policy` in `next.config.mjs` `headers()` |
| Cross-Domain Misconfiguration (`Access-Control-Allow-Origin: *`) | Medium / Medium confidence | Override Vercel’s default `*` with the app origin in `next.config.mjs` |

## After deploy

```powershell
curl.exe -sI "https://campus-placement-omega.vercel.app/" | findstr /I "content-security access-control"
curl.exe -sI "https://campus-placement-omega.vercel.app/_next/static/chunks/webpack.js" | findstr /I "access-control"
```

Expect:
- `Content-Security-Policy: ...`
- `Access-Control-Allow-Origin: https://campus-placement-omega.vercel.app` (not `*`)
