# Placement Hub — AWS catch-up from Vercel (2026-11-13)

Status: **AWS executed 2026-11-13** (see `Implementation Log.md`). App-only. No SQL. No account blank-fill.

Related: `07-operations/deployment.md`, prior push `09-work/2026-11-06-published-desc-push/`, workspace `aws deploy/push-2026-11-13-ph/`.

## Baseline

| Item | Value |
|------|--------|
| Prior AWS tip | `657ea3e` (2026-11-06) + migration `117` |
| Ship source | Working tree matching Vercel (`deploy.bat` tree), packed as `placementhub-20261113-1705.tar.gz` |
| Schema tip | Still `117` — no new migrations |

## Schema / backfill

**None.** Phase 0 RO compare of 12 catch-up tables matched AWS ↔ Vercel/local column lists. `project_attachments` present. Active users with null `email_verified_at` = 0. `testEnvironment` on AWS = false.

## Env

Do **not** copy Vercel `OUTBOUND_EMAIL_OVERRIDE`. AWS already has `ZEPTOMAIL_FROM_EMAIL`; override unset. Keep Test environment **No**.
