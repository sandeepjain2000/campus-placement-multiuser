# Placement Hub — AWS push plan (2026-11-06)

Status: **AWS executed 2026-11-06** (see `Implementation Log.md`). No schema. Vercel not executed.

Related: `07-operations/deployment.md`, `09-work/2026-11-02-env-sync-push/` (last AWS execute), hard constraints in `PROJECT_INDEX.md`.

Workspace mirror (ops scripts / outputs when executed): `aws deploy/AWS-PUSH-PLAN-2026-11-06-ph.md` and `aws deploy/push-2026-11-06-ph/`.

## 1. Confirmed current state (checked 2026-11-06)

| Fact | Value |
|------|--------|
| Local / GitHub `main` | `657ea3efd641f9b80218e1d08250e2bc97cc15db` |
| vs last AWS PH tip | AWS was updated **2026-11-02** to `4ed6263…` + migration `117` |
| Commits AWS does not have | Exactly **`657ea3e`** (`4ed6263..657ea3e`) |
| Product files in that commit | `src/lib/jobPostingPublishState.js`, `src/app/dashboard/employer/projects/page.js`, unit test, Cortex docs only |
| New files under `db/migrations` since Nov 2 | **None** — tip migration remains `117_project_attachments.sql` |
| Vercel | Not required for this AWS plan. Ship Vercel separately with `deploy.bat` only if the owner asks |

## 2. Schema and backfill — answer

**No schema change. No blank-fill / account backfill.**

| Concern | Needed? |
|---------|---------|
| New SQL migration | **No** |
| Re-run `117` | **No** — already applied on AWS 2026-11-02 (`project_attachments` exists) |
| ALTER on users / employers / colleges / job_postings | **No** — not in this delta |
| Fill blanks to preserve existing accounts | **No** — no new columns on old rows |
| Env / secret change on EC2 | **No** — copy live `.env` into staging as usual |
| Touch InternSafar process / folder | **No** |

Why this is safe: the bugfix only changes how published PATCH compares and sends fields in JS. Login, approval, and stored rows are unchanged. Existing competitions keep the same DB values; description edits stop being blocked by false “core field” mismatches (CGPA `0`→`5`, blank max prize → min, empty skills → `General`).

## 3. What kind of push this is

**App/code-only Path M-style update** (Placement Hub folder on shared EC2, port **3001**). Same shape as 2026-11-02 Parts pack → staging build → swap → restart `placementhub` only — **omit Part D / migration**.

## 4. Scope shipping to AWS

- Employer Projects: description-only save after college approve/publish works (false core-field rejects fixed).
- Unit coverage for that compare path (tests in repo; not run on EC2).

Does **not** include: new auth rules, core-account changes, mail tests, InternSafar code.

## 5. Channels (execute only when asked)

GitHub push does **not** deploy AWS or Vercel.

### A — GitHub

Already on `origin/main` as `657ea3e`. No GitHub action required for this AWS push.

### B — Schema

**Skip.** Optional read-only check only: `SELECT to_regclass('public.project_attachments');` should be non-null (from 2026-11-02). If somehow null, **stop** and reopen the Nov 2 plan — do not invent a fill.

### C — Vercel

Out of scope unless the owner asks. Then `deploy.bat` only (`lawcarelegal20-6778`).

### D — AWS app pack (when owner says execute)

1. Prefer a Placement Hub–scoped pre-change dump / keep prior rollback folder pattern from Nov 2; do not restore whole shared DB (would affect InternSafar).
2. Pack clean tree at `657ea3e` (or `git log -1` if still that tip). Exclude `.env*`, `node_modules`, `.next`.
3. Upload to EC2 `13.127.235.165`, extract to staging, copy **live** Placement Hub `.env` into staging.
4. Build in staging (temporary swap file OK; remove after). Live site stays up.
5. Swap live Placement Hub folder; restart **`placementhub` only**. Do not restart/stop InternSafar, reboot, or resize.
6. Smoke: `https://app.placementhub.online/login` 200; InternSafar still 200; PM2 both online, `unstable_restarts` 0.
7. Product smoke (genuine account only — not the 20 core accounts): Employer → Projects → Edit a **published/approved** competition → change **description only** → Save succeeds. Do not run bounce-causing mail tests.
8. Log results in this folder’s `Implementation Log.md` and bump `07-operations/deployment.md` “latest AWS” line. Do not commit unless the owner asks.

## 6. Rollback

Move prior `~/placementhub-old-<timestamp>` back and restart PM2 `placementhub`. No SQL applied → no DB restore for this push.

## 7. Risks / open

- Confirm live AWS still reports app tip / rollback folder from 2026-11-02 before swap (read-only).
- If working tree is dirty at execute time, pack only the committed tip `657ea3e`, not uncommitted edits.
- Description fix is already on GitHub; AWS alone can lag until this plan runs.
