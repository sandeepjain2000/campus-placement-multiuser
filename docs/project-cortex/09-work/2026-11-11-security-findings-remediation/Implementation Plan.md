# Placement Hub — security findings verification & remediation plan (2026-11-11)

Status: **Plan only — no fixes applied.** Owner must approve before any code or config change.

Related evidence (workspace):

- Zip (priority): `Site Testing Placem-20261111T100725Z-1-001.zip`
- Report: `Cybersecurity_Analyst_Candidate_Report_Darshann.docx` (also inside the zip)
- ChatGPT candidate review: context only; if it conflicts with the zip, **zip wins**

Out of scope for this folder: InternSafar findings (separate plan in InternSafar `docs/ai-context/work/`), Frappe Helpdesk, Part 1 dummy-log exercise, hiring scoring.

**Secrets rule:** this document must not store live passwords, tokens, or keys. Demo seed password is referred to only as the shared seed string already known in-repo (`DEMO_SEED_PASSWORD` / `DEMO_PASSWORD`).

---

## 1. Evidence map (zip screenshots ↔ claim)

| Zip file | Host / surface | Maps to |
|----------|----------------|---------|
| `help desk expose.png` | `app.placementhub.online/login` — help widget answer for “admin password” | **PH-01** |
| `hardcoded pass expose in js.png` | DevTools Sources on login JS chunk — shared seed password + demo emails | **PH-02** |
| `admin setting aws expos.png` | Authenticated Super Admin → Platform Settings → Email (YOPmail fields; Test environment = No on that host) | **PH-03 related** (config / mailbox) |
| `admin mail findings.png` | Burp `GET /api/auth/session` as Platform Admin | **Not a vuln by itself** — shows a valid super_admin session (likely after PH-01/PH-02) |
| `tests.png` | Mostly InternSafar captcha traffic; PH `/login` also listed | Cross-app noise — not PH proof |

Zip does **not** contain a clear screenshot of `/api/debug/*` responses or of an nginx `Server:` header. Those claims come from the report text only.

---

## 2. Finding-by-finding verification (code + evidence)

### PH-01 — Unauthenticated help returns Super Admin / demo credentials

| Field | Assessment |
|-------|------------|
| Claimed | `POST /api/help/ask` returns Super Admin demo credentials and QA/dev notes without login |
| Zip | **Supported** — help sidebar on `/login` answers “admin password” with Super Admin email, shared seed password, YOPmail, and internal routes |
| Code | **Present.** `src/app/api/help/ask/route.js` has **no session check**. RAG corpus is built in `src/lib/helpKnowledgeBuild.js` from `developerNotes.js`, including `EMAIL_DEMO_NOTES` and a “Demo logins” chunk that embeds `DEMO_PASSWORD` and account emails with `audience: ['all']` |
| Verdict | **Confirmed Critical** for production if live corpus still contains those chunks (matches zip UI) |
| Severity note | Critical is justified if the returned password still signs into a live Super Admin (or other roles). Rotate/assume compromise until proven otherwise |

**Proposed fix (do not implement yet):**

1. Require an authenticated session (and preferably role) on `POST /api/help/ask` and related help APIs; keep FAQ-only public content if product needs unauthenticated help.
2. Remove developer/QA sources from the production help corpus: stop importing `EMAIL_DEMO_NOTES`, `DEMO_PASSWORD`, cleanup CLI commands, and demo login lists into `buildHelpKnowledgeChunks` (or gate them behind a non-production sync flag).
3. Re-sync / rebuild help knowledge DB so production chunks no longer contain secrets.
4. Rotate the shared demo / Super Admin seed password and any accounts that used it; treat PH-02 the same rotation event.
5. Smoke: unauthenticated ask for “admin password” must not return credentials; authenticated non-admin must not get developer corpus.

---

### PH-02 — Shared hardcoded password in client JS bundle

| Field | Assessment |
|-------|------------|
| Claimed | Production JS bundle embeds one password for 18+ demo accounts including Super Admin |
| Zip | **Supported** — Sources panel on `app.placementhub.online/login` shows seed password constant + demo account array |
| Code | **Present.** `src/lib/demoLogins.js` exports `DEMO_SEED_PASSWORD` and `DEMO_LOGINS` (includes `admin@placementhub.com`). Imported by `src/app/login/page.js` (prefill / demo cards). Also `src/content/developerNotes.js` `DEMO_PASSWORD` and Developer UI. `isDemoLoginsEnabled()` defaults **on** in production unless `NEXT_PUBLIC_HIDE_DEMO_LOGINS=true` |
| Verdict | **Confirmed Critical** while those accounts remain reachable with that password on the tested host |
| Severity note | Even if demo cards are hidden, any client import of the password string still ships in the bundle |

**Proposed fix (do not implement yet):**

1. Never ship a real password string in client bundles. Prefill only in local/dev via server-only env, or remove one-click demo login from production entirely.
2. Default `isDemoLoginsEnabled()` to **off** in production; require an explicit opt-in for demo hosts only.
3. Use unique strong passwords per seed account; store only in seed scripts / secrets managers, not in `NEXT_PUBLIC_*` or shared client modules.
4. Remove Super Admin from any public demo picker.
5. Rotate all accounts that shared the old seed password (coordinate with bounce-mail / core-account rules — do not mail-bomb or touch the 20 AWS core accounts casually; use genuine test accounts for verify).

---

### PH-03A — Debug endpoints reachable without auth (report summary / ChatGPT naming)

| Field | Assessment |
|-------|------------|
| Claimed | `/api/debug/*` live in production, client-toggled |
| Zip | **No dedicated screenshot** of debug responses |
| Code | **Present and public.** `src/app/api/debug/login-log/route.js` and `src/app/api/debug/log/route.js` are documented as no-auth ingest; login page calls `/api/debug/login-log`. They write to `platform_error_logs` (email, steps, IP, UA) |
| Verdict | **Confirmed as unauthenticated write surface** (High for abuse/log injection; not the same as credential disclosure). Treat as separate from PH-03B |

**Proposed fix:**

1. Gate debug routes with a server-only flag (e.g. enabled only when `NODE_ENV !== 'production'` or an explicit `DEBUG_INGEST_ENABLED=true`).
2. Rate-limit and schema-validate payloads; never accept arbitrary large blobs.
3. Prefer authenticated or signed ingest if production troubleshooting is still required.

---

### PH-03B — 2FA off / test-environment / YOPmail in platform config (zip report detailed PH-03)

| Field | Assessment |
|-------|------------|
| Claimed | Client/config shows `enableTwoFactorAuth: false`, `testEnvironment: true`, public YOPmail system inbox |
| Zip | **Partially supported.** Settings screenshot shows YOPmail inbox + webmail URL; **Test environment = No** on that AWS host at capture time (conflicts with report’s `testEnvironment:true` claim for that host — **zip wins for that host**) |
| Code | **Defaults match the risk.** `src/lib/platformSettingsDefaults.js`: `enableTwoFactorAuth: false`, `testEnvironment: true`, `systemNotificationInboxEmail` / webmail default to YOPmail. Admin settings UI labels mail as “ZeptoMail/SMTP…” (vendor name in UI — separate policy issue) |
| Verdict | **Confirmed configuration risk in code defaults.** Live AWS may already have Test environment = No (zip). 2FA default off and YOPmail as default inbox remain real issues to harden |

**Proposed fix:**

1. Production defaults: `testEnvironment: false`, private monitored inbox (not disposable YOPmail), 2FA policy decided by owner.
2. Audit live AWS/Vercel platform settings rows vs defaults; document actual values without pasting secrets.
3. Replace visible “ZeptoMail” UI copy with neutral “email” wording (`no-email-vendor` rule).
4. Ensure login/support surfaces do not advertise disposable inboxes on production.

---

### PH-04 — Server version disclosure (`Server: nginx/1.24.0`)

| Field | Assessment |
|-------|------------|
| Claimed | nginx version in HTTP `Server` header |
| Zip | **Not evidenced** in provided screenshots |
| Code / infra | App sets `poweredByHeader: false` in `next.config.mjs`. nginx version would be from **EC2 reverse proxy**, not Next.js |
| Verdict | **Plausible / report-only** until header capture is rechecked on `app.placementhub.online`. Severity at most **Low–Medium** |

**Proposed fix:** on the AWS nginx (or equivalent) set `server_tokens off;` (and any WAF header scrub). No app code change required if confirmed at proxy only.

---

### Extra zip item — authenticated `/api/auth/session` (admin mail findings)

Not a standalone vulnerability: returning role/email for the **current** session is normal NextAuth behaviour. It is useful as proof that Super Admin login was achieved during the test window (impact amplifier for PH-01/PH-02).

---

## 3. Priority order when owner says “fix”

1. **PH-01** — strip secrets from help corpus + auth-gate help ask; rotate exposed credentials  
2. **PH-02** — remove client-bundled password / production demo logins; same rotation  
3. **PH-03A** — disable public debug ingest in production  
4. **PH-03B** — harden platform defaults / live settings (2FA policy, inbox, test flag, vendor-neutral copy)  
5. **PH-04** — confirm nginx header; `server_tokens off` if still present  

## 4. Verification checklist (after future fixes)

- Unauthenticated `POST /api/help/ask` with credential-seeking prompts → no passwords, no demo account list, no cleanup CLI text.
- Production login JS search for seed password string → no hits (or only non-production builds).
- `POST /api/debug/log` and `/api/debug/login-log` → 404/403 when production gate is off.
- Platform settings defaults and live prod values reviewed; no disposable inbox as production default.
- Optional: response headers on AWS without nginx version token.
- Do **not** use the 20 core accounts for retest; do **not** send bounce-causing mail.

## 5. Open decisions for owner

- Keep any demo login UX on Vercel preview only, or remove entirely?
- Is Super Admin seed account still required for demos, or should demos use a lower-privilege account?
- Enable 2FA platform-wide or per-role?
- Confirm whether live help chunks are DB-backed (`documentation_help_chunks`) and need a one-time purge after code change.

## 6. Explicitly not done in this task

No code changes, no env edits, no deploys, no credential rotation, no nginx edits.
