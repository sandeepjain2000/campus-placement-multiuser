# Placement Hub — env sync push plan (2026-11-02)

Status: **AWS executed 2026-11-02** (see `Implementation Log.md`). Vercel still **not** executed. Do not re-run AWS pack/migration unless a new commit is pinned.

Related standing rules: `07-operations/deployment.md`, `05-decisions/README.md`, hard constraints in `PROJECT_INDEX.md`.

## 1. Confirmed current state (checked 2026-11-02)

| Fact | Value |
|------|--------|
| Local branch | `main`, clean working tree |
| vs `origin/main` | In sync (`0` ahead / `0` behind) |
| Commit to ship | `4ed6263be119f7b375838ab0d4804295865f1e38` (`git log -1` on `main`) |
| Local DB | Supabase via `.env.local` — **has** `project_attachments`; users already have `email_verified_*` columns |
| Vercel app | `https://campus-placement-omega.vercel.app/` — sign-in home; Demo accounts chrome still visible (env-gated) |
| AWS app | `https://app.placementhub.online/` — sign-in home; Demo accounts hidden |
| DBs | Local/Vercel → Supabase. AWS → shared Postgres with InternSafar (same server/EC2) |

Cortex note: some index lines still say “AWS not started.” `07-operations/deployment.md` is the accurate ops note: server/tables done 2026-10-21; app URL answers.

## 2. What kind of push this is

**App/code sync + one additive schema on AWS if missing.**

| Concern | Needed? |
|---------|---------|
| New GitHub commits from this PC | **No** — already on `origin/main` |
| Vercel code deploy (`deploy.bat`) | **Yes**, if Vercel should match this commit (confirm with owner) |
| AWS code pack of `git log -1` | **Yes**, if AWS should match this commit (confirm with owner) |
| Schema migration `117_project_attachments.sql` | **Yes on any DB missing the table** (expect AWS; local already has it) |
| Account-preserving blank-fill backfill | **No** |

### Why no account backfill

`db/migrations/117_project_attachments.sql` only `CREATE TABLE IF NOT EXISTS project_attachments` (+ indexes). It does not `ALTER` `users`, `employer_profiles`, colleges, or `job_postings`. Empty attachment rows are valid; login and existing profiles do not depend on this table. This is not the “new columns blank on old rows → fill to preserve accounts” case.

## 3. Scope of the commit being shipped

Includes (among earlier `main` history since AWS first setup):

- Admin Colleges/Employers name-button outline / styling fix (`.admin-entity-name-btn`)
- Other UI/sign-in work already on `main` after 2026-10-21
- Migration file `117` (table for project/hackathon attachments)

Does **not** invent new auth rules or require changing the 20 core accounts.

## 4. Channels (Cortex order — execute only when asked)

Three separate pipes. A GitHub push does **not** deploy Vercel or AWS.

### A — GitHub

1. Confirm still clean and `origin/main` == local `4ed6263…`.
2. If anything new appears locally later, commit only when the owner asks, then push only when the owner asks.
3. **Today:** no GitHub action required for sync.

### B — Schema (before or with hosts that need attachments)

1. On **local Supabase:** already applied — skip unless re-check fails.
2. On **Vercel’s database:** if it is the same Supabase as local, skip. If different, apply `117` there with the same SQL file (owner confirms URL sameness; do not paste secret values into Cortex).
3. On **AWS shared Postgres:**  
   - Read-only check: `SELECT to_regclass('public.project_attachments');`  
   - If null → run `db/migrations/117_project_attachments.sql` only.  
   - If present → skip.  
   - No fill script for users/employers/colleges.

Prefer a Placement Hub–only pre-change dump on the server before AWS SQL (per `deployment.md`), then apply `117`.

### C — Vercel app deploy

1. From `campus-placement-multiuser`, run **`deploy.bat`** only (account `lawcarelegal20-6778`, token in `.env.vercel.local`).
2. Do **not** run `vercel` / `vercel --prod` by hand; do not keep `.vercel\project.json`.
3. After deploy: open `/` and `/login` — sign-in page, no restored demo landing route.
4. Smoke with a **genuine** account only — not the 20 core accounts. No bounce-causing mail tests.

### D — AWS app pack

1. Pack commit `git log -1` prints on `main` (currently `4ed6263…`). Do not pack `dd6e3a5`.
2. Deploy beside InternSafar (PH port **3001**, InternSafar **3000**). Do not restart/stop InternSafar, reboot, or resize.
3. Do not change Namecheap `@` or `www`. Subdomain only: `https://app.placementhub.online/`.
4. After pack + schema check: sign-in page loads; InternSafar still answers; homepage `placementhub.online` unchanged.
5. Smoke with a genuine account only. Do not touch core accounts.

## 5. Suggested execution order (when owner says go)

1. Re-confirm `git status` / `git log -1` / in-sync with `origin`.
2. Schema: confirm `project_attachments` on each target DB; apply `117` only where missing.
3. Vercel: `deploy.bat` (if in scope for that go-message).
4. AWS: pack + restart PH process only as the guide allows (if in scope).
5. Smoke both hosts + InternSafar + marketing homepage.
6. Log results in this folder’s `Implementation Log.md` (create when execution starts).

## 6. Explicit non-goals for this push

- No full Supabase → AWS data re-copy.
- No `DROP TABLE … CASCADE` / no whole-DB restore.
- No core-account password/email/verify changes.
- No bounce mail tests.
- No InternSafar restart or homepage DNS edits.
- No new bucket / bucket policy / CORS changes.

## 7. Open points (owner confirmation before execute)

1. Ship **Vercel**, **AWS**, or **both** in the first execute message?
2. Confirm Vercel `DATABASE_URL` is the same Supabase as local (yes/no) without pasting the value.
3. Confirm whether AWS already has `project_attachments` (or allow a read-only check on the server).
4. Any extra commits after `4ed6263` before execute? If yes, re-pin `git log -1`.

## 8. Rollback sketch (if something fails after execute)

| Layer | Undo |
|-------|------|
| Vercel | Redeploy previous known-good deployment from that Vercel project history (via `deploy.bat` / owner process) |
| AWS app | Restore previous PH code folder/process per setup guide; leave InternSafar alone |
| Schema `117` | Table is additive. Leaving it empty is safe. Drop only if owner explicitly asks and FK checks pass — not part of default rollback |

## 9. Execution gate

**AWS (channels B+D for this host) executed 2026-11-02** per owner request “push to placementhub aws production”. Vercel (`deploy.bat`) still waits for an explicit execute.
