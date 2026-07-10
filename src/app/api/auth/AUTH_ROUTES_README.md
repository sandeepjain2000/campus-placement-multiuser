# Auth Routes — Critical Authentication Path

> ⚠️ **DO NOT wrap files in this directory with `withApiHandlers` or any generic error-logging middleware.**

## Why?

NextAuth.js route handlers (`[...nextauth]/route.js`) return a mix of:
- **HTTP redirects** (302) for OAuth callbacks and sign-out flows
- **CSRF tokens** as plain text or JSON
- **HTML pages** for built-in sign-in/error UI
- **Session JSON** for `/api/auth/session`

Generic API error-logging wrappers (like `withApiHandlers` / `logApiResponseIfFailure`) assume all responses are standard JSON API responses. When applied to NextAuth routes, they:

1. **Parse non-JSON responses** as JSON → throws, potentially swallowing errors
2. **Treat redirect status codes** as failures → logs false errors
3. **Replace 5xx response bodies** with platform error JSON → corrupts NextAuth's error handling
4. **Add database write latency** to every auth request → slows login flow

This has caused the **"double login" bug** multiple times.

## What to do instead

If you need error observability for authentication failures, add a `try/catch` **inside** the `authHandler` function in `[...nextauth]/route.js`:

```js
async function handler(req, context) {
  try {
    const response = await nextAuthHandler(req, context);
    return applySessionCookiePolicy(response);
  } catch (err) {
    console.error('[NextAuth] Unhandled error:', err);
    // Optionally write to platform_error_logs here
    throw err; // Let NextAuth handle the error response
  }
}
```

## Files in the auth critical path

These files form the authentication pipeline and should be modified with extreme care:

| File | Role |
|------|------|
| `[...nextauth]/route.js` | NextAuth request handler + session cookie policy |
| `../../login/page.js` | Client-side login form + session state management |
| `../../../components/SessionLifetimeGuard.jsx` | Stale session detection on dashboard routes |
| `../../../lib/sessionPolicy.js` | Cookie policy, browser session marker |
| `../../../lib/auth.js` | NextAuth options, JWT/session callbacks |
| `../../../components/AuthProvider.js` | SessionProvider wrapper |
| `../../auth/continue/route.js` | Post-login JWT redirect |
| `../../../middleware.js` | Server-side route protection |

## History

- **2026-06-11**: Fixed double-login by removing stale-session signOut loop on login page
- **2026-06-12**: Fixed regression caused by `withApiHandlers` wrapping of NextAuth route
