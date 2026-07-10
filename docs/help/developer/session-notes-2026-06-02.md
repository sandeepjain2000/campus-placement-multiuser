# Session notes — 2 Jun 2026

> **Status:** Login issues resolved (confirmed by Sandeep). Treat repo working tree as source of truth.

## Login / auth (resolved)

- **Symptom:** Sign-in failures, “Unable to sign in”, or flaky sessions on Vercel/production.
- **Likely cause:** Supabase session pooler exhausted (`max clients reached`) — app pool was up to 20 connections per serverless instance vs pooler limit ~15.
- **Fix in tree:** `src/lib/db.js` — `max: 1` + `allowExitOnIdle` on Vercel/serverless; shorter idle timeout.
- **Related hardening:** `src/lib/auth.js` — `queryWithLoginRetry()` for transient DB errors (`53300`, `too many clients`, timeouts).
- **Post-login flow:** `/auth/continue` server redirect from JWT; `SessionLifetimeGuard` + login page session marker (`sessionPolicy`).
- **Captcha:** `src/lib/simpleCaptcha.js`, `src/app/api/auth/captcha/verify/route.js`, `src/app/login/page.js`.

## Alumni jobs routing

- Browse: **`/dashboard/alumni/jobs`** (not `/dashboard/student/jobs`).
- Applications: **`/dashboard/alumni/applications/jobs`**.
- Getting started: **`/dashboard/alumni/getting-started`** (legacy `/dashboard/student/getting-started` redirects for alumni).
- Legacy URLs redirect via `src/middleware.js`; constants in `src/lib/alumniRoutes.js`.
- Alumni still use **student** role + `isAlumni` flag on session/profile.

## Alumni jobs data (when list is empty, no error)

- Job types: `full_time`, `contract` only.
- Students see jobs only when `job_posting_visibility.college_status = 'approved'` (migration **077**).
- Demo alumni: `priya.sharma.alumni@iitm.edu` / `Admin@123` (IIT Madras).
- Onboarding step 3 for alumni checks **`program_applications`**, not placement `applications`.

## Migrations to keep production aligned

Run on the same `DATABASE_URL` as Vercel when needed:

```bash
npm run db:migrate:066
npm run db:migrate:067
npm run db:migrate:074
npm run db:migrate:075
npm run db:migrate:077
npm run db:migrate:078
```

## Other in-flight changes (same working tree)

- Employer alumni job create/edit UX, `CurrencyAmountInput`, apply/eligibility fixes.
- Migration **078** restores alumni jobs accidentally soft-deleted by re-run of **074**.
- QA route list updated for alumni paths (`qa/routes-by-role.js`).

## Demo logins

See [demo-logins.md](./demo-logins.md). Alumni account documented above.
