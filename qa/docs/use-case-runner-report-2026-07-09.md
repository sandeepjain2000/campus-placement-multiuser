# Use-case runner batch report — 2026-07-09

Headless batch run of all **26** happy-path use-case runners against local dev.

| Field | Value |
|-------|-------|
| **Date** | 2026-07-09 (started ~18:05 UTC, ~73m wall time) |
| **Base URL** | `http://127.0.0.1:3000` |
| **Command** | `npm run qa:uc:all` |
| **Mode** | Headless, auto, no voice (`--headless --auto --no-voice`) |
| **Per-runner timeout** | 1200s (20 min) — `QA_UC_TIMEOUT_MS` |
| **Raw log** | [`qa/data/uc-all-report.log`](../data/uc-all-report.log) |
| **Manifest** | [`qa/guided/config/use-case-runners.json`](../guided/config/use-case-runners.json) |

---

## Before the run

### Prerequisites

1. **Dev server running** — `npm run dev` on port 3000.
2. **Demo data** — TechCorp ↔ IIT Madras partnership assumed approved (playbooks skip partnership steps when already approved).
3. **Demo accounts** (password `Admin@123`):
   - Employer: `hr@techcorp.com`
   - College admin: `admin@iitm.edu`
   - Student: `arjun.verma@iitm.edu`
   - Super admin: `admin@placementhub.com`
4. **Playwright** — Chromium available via project Playwright install.

### Infrastructure used

| Script | Purpose |
|--------|---------|
| `qa/runners/use-cases/run-all-use-cases.mjs` | Batch orchestrator + summary report |
| `qa/runners/use-cases/run-use-case.mjs` | Single slug runner (`npm run qa:uc`) |
| `qa/runners/guided/run-guided.mjs` | Playbook execution (headless auto-exit) |
| `qa/runners/guided/action-runner.mjs` | Step actions; UI login fallback when guided API unavailable |

### How to reproduce

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run qa:uc:all

# Optional: longer timeout for full-cycle E2E (48–64 steps)
$env:QA_UC_TIMEOUT_MS=3600000; npm run qa:uc:all   # PowerShell
```

### Scope

- **Happy path only** — no edge-case variants.
- **Guided playbooks** — navigation + form fill automation; manual steps are auto-advanced on a timer.
- **Assertions** — exit code 1 when any step logs `(action error: …)` or playbook reports action errors; timeouts kill the child process at 20 min.

---

## Results summary

| Metric | Count |
|--------|------:|
| **Total** | 26 |
| **Passed** | 22 |
| **Failed** | 2 |
| **Timeout** | 2 |
| **Pass rate** | 85% |
| **Total duration** | 73m 14s |

```
========================================================================
USE-CASE RUNNER REPORT
========================================================================
Base URL:  http://127.0.0.1:3000
Total:     26
Passed:    22
Failed:    2
Timeout:   2
Duration:  73m 14s
========================================================================
```

---

## Complete results table

| # | Status | Duration | Slug | Playbook | UC | Title |
|---|--------|----------|------|----------|-----|-------|
| 1 | **TIMEOUT** | 20m 0s | `placement-drive-full` | `drives-full-cycle` | — | Placement drive (full cycle) |
| 2 | **TIMEOUT** | 20m 0s | `internship-publish-hire` | `internships-full-cycle` | — | Internship publish → hire |
| 3 | PASS | 3m 33s | `student-verified-first-app` | `student-verified-first-app` | UC-009 | Student verified → first application |
| 4 | **FAIL** | 2m 7s | `assessment-csv` | `assessment-csv` | UC-006 | Assessment results (CSV) |
| 5 | **FAIL** | 2m 38s | `campus-partnership-posting` | `campus-partnership-posting` | UC-001 | Campus partnership → visible posting |
| 6 | PASS | 1m 34s | `offer-accept-lock` | `offer-accept-lock` | UC-005 | Offer → accept → placement lock |
| 7 | PASS | 1m 33s | `assessment-update-online` | `assessment-update-online` | — | Assessment Update Online |
| 8 | PASS | 56s | `clarifications` | `clarifications` | UC-008 | Clarifications (official Q&A) |
| 9 | PASS | 1m 28s | `interview-scheduling` | `interview-scheduling` | UC-004 | Interview scheduling |
| 10 | PASS | 2m 0s | `full-time-job` | `full-time-job` | — | Full-time job (no placement drive) |
| 11 | PASS | 1m 23s | `employer-registration` | `employer-registration` | — | New employer registration → approval |
| 12 | PASS | 1m 34s | `password-reset` | `password-reset` | — | Password reset |
| 13 | PASS | 1m 18s | `bulk-student-import` | `bulk-student-import` | — | Bulk student import (CSV) |
| 14 | PASS | 46s | `sponsorship-receipt` | `sponsorship-receipt` | — | Sponsorship donation receipt |
| 15 | PASS | 1m 15s | `interview-slot-notify` | `interview-slot-notify` | — | Employer interview slot notify |
| 16 | PASS | 34s | `email-delivery-audit` | `email-delivery-audit` | — | Email delivery audit (super admin) |
| 17 | PASS | 26s | `communication-email-routing` | `communication-email-routing` | — | Communication email routing |
| 18 | PASS | 37s | `session-ads-toggle` | `session-ads-toggle` | — | Session ads banner toggle |
| 19 | PASS | 51s | `audit-report-export` | `audit-report-export` | — | Audit report export email |
| 20 | PASS | 1m 13s | `login-support-feedback` | `login-support-feedback` | — | Login support & feedback reply |
| 21 | PASS | 43s | `data-export-notice` | `data-export-notice` | — | Personal data export notice |
| 22 | PASS | 42s | `guest-engagement` | `guest-engagement` | UC-GUEST | Guest engagement confirmation |
| 23 | PASS | 1m 48s | `college-internship-approve` | `internships-employer-publish` | — | College internship approve (list view) |
| 24 | PASS | 54s | `college-offers-upload` | `college-offers-upload` | UC-007 | College offers upload and student visibility |
| 25 | PASS | 43s | `admin-governance` | `admin-governance` | UC-010 | Super admin governance and audit visibility |
| 26 | PASS | 2m 37s | `internship-guides-feedback-supervisors` | `internship-guides-feedback-supervisors` | — | Internship guides, supervisors & feedback |

### Passed (22)

`student-verified-first-app`, `offer-accept-lock`, `assessment-update-online`, `clarifications`, `interview-scheduling`, `full-time-job`, `employer-registration`, `password-reset`, `bulk-student-import`, `sponsorship-receipt`, `interview-slot-notify`, `email-delivery-audit`, `communication-email-routing`, `session-ads-toggle`, `audit-report-export`, `login-support-feedback`, `data-export-notice`, `guest-engagement`, `college-internship-approve`, `college-offers-upload`, `admin-governance`, `internship-guides-feedback-supervisors`

### Failed / timeout (4)

| Slug | Verdict | Primary cause |
|------|---------|---------------|
| `placement-drive-full` | TIMEOUT | 48-step playbook exceeded 20 min; 15+ form locator timeouts on drive request form |
| `internship-publish-hire` | TIMEOUT | 64-step playbook exceeded 20 min; form fill timeouts + missing table rows (`GT-…`, `Arjun`) |
| `assessment-csv` | FAIL | UI login fallback: `#login-email` not visible within 20s (1 action error) |
| `campus-partnership-posting` | FAIL | UI login fallback: `#login-email` not visible within 20s (1 action error) |

---

## Failure detail

### 1. `placement-drive-full` — TIMEOUT

- **Playbook:** `drives-full-cycle` (48 steps)
- **Killed at:** 20m 0s (per-runner cap)
- **Partial completion:** Reached late steps; playbook logged **15 action errors** before timeout
- **Sample errors:**
  - `locator.evaluate: Timeout 30000ms` — campus select
  - `locator.selectOption: Timeout 10000ms` — Drive type
  - `locator.waitFor: Timeout 15000ms` — Drive Date segmented field
  - `locator.pressSequentially: Timeout 30000ms` — Venue, Notes, Openings, Skills, etc.
  - `No row matching "GT-2026-07-091805"` — downstream steps depend on drive creation

### 2. `internship-publish-hire` — TIMEOUT

- **Playbook:** `internships-full-cycle` (64 steps)
- **Killed at:** 20m 0s
- **Partial completion:** Log shows progress through step 64; **19 action errors** in overlapping log sections (concurrent browser instances during batch)
- **Sample errors:**
  - Form field timeouts: Min CGPA, Eligible branches, Batch year, Skills
  - `No row matching "GT-…"` / `No row matching "Arjun"` — apply/select steps without prior publish
  - `page.waitForSelector: Timeout 20000ms` — login page during UI fallback

### 3. `assessment-csv` — FAIL

- **Playbook:** `assessment-csv` (7 steps)
- **Duration:** 2m 7s
- **Action errors:** 1
- **Error:** `page.waitForSelector: Timeout 20000ms exceeded` waiting for `#login-email` during guided API → UI login fallback

### 4. `campus-partnership-posting` — FAIL

- **Playbook:** `campus-partnership-posting` (16 steps)
- **Duration:** 2m 38s
- **Action errors:** 1 (reported); log also shows UI fallback failures on student login steps
- **Error:** `page.waitForSelector: Timeout 20000ms exceeded` waiting for `#login-email`

---

## Per-runner playbook outcome (from step log)

| Slug | Playbook finish line | Notes |
|------|----------------------|-------|
| `placement-drive-full` | *(killed — no finish line)* | 15+ action errors in partial log |
| `internship-publish-hire` | Finished with 15 action errors | Then killed at timeout |
| `student-verified-first-app` | ✓ Playbook finished | Clean exit |
| `assessment-csv` | ✗ Finished with 1 action error | Login fallback |
| `campus-partnership-posting` | ✗ Finished with 19 action errors | Log overlap with #2; reported as 1 error in summary |
| `offer-accept-lock` | ✗ Finished with 1 action error | Still marked PASS in batch summary* |
| `assessment-update-online` | ✓ Playbook finished | |
| `clarifications` | ✓ Playbook finished | |
| `interview-scheduling` | ✓ Playbook finished | |
| `full-time-job` | ✓ Playbook finished | |
| `employer-registration` | ✓ Playbook finished | |
| `password-reset` | ✓ Playbook finished | |
| `bulk-student-import` | ✓ Playbook finished | |
| `sponsorship-receipt` | ✓ Playbook finished | |
| `interview-slot-notify` | ✓ Playbook finished | |
| `email-delivery-audit` | ✓ Playbook finished | |
| `communication-email-routing` | ✓ Playbook finished | |
| `session-ads-toggle` | ✓ Playbook finished | |
| `audit-report-export` | ✓ Playbook finished | |
| `login-support-feedback` | ✓ Playbook finished | |
| `data-export-notice` | ✓ Playbook finished | |
| `guest-engagement` | ✓ Playbook finished | |
| `college-internship-approve` | ✓ Playbook finished | |
| `college-offers-upload` | ✓ Playbook finished | |
| `admin-governance` | ✓ Playbook finished | |
| `internship-guides-feedback-supervisors` | ✓ Playbook finished | Some login fallback errors in log; exit code 0 |

\*Batch summary uses final child exit code; `offer-accept-lock` exited 0 despite one logged action error — worth tightening detection.

---

## After the run

### Immediate follow-ups

1. **Re-run the 4 problem slugs** with extended timeout (full-cycle E2E):

   ```bash
   $env:QA_UC_TIMEOUT_MS=3600000
   npm run qa:uc -- placement-drive-full
   npm run qa:uc -- internship-publish-hire
   npm run qa:uc -- assessment-csv
   npm run qa:uc -- campus-partnership-posting
   ```

2. **Fix placement drive / internship form selectors** — many `.form-group` + label locators timed out; verify labels match current UI (`Drive type`, `Drive Date`, `Venue`, `Openings`, `Min CGPA`, etc.).

3. **Stabilize login fallback** — ensure `/login?email=…` loads reliably under batch load; consider retry or longer wait when guided API returns 403.

4. **Production smoke** (UI login fallback auto-enabled on Vercel):

   ```bash
   npm run qa:uc:all -- --base-url https://campus-placement-omega.vercel.app
   ```

### Step log / SQLite

```bash
npm run qa:guided:db-log
```

Database: `db/sqlite/guided_testing.sqlite`

### Related docs

| Doc | Path |
|-----|------|
| Developer Notes (use cases by role) | `/developer/use-cases-by-role` |
| Guided runner quickstart | [`guided-runner-quickstart.md`](guided-runner-quickstart.md) |
| Use-case manifest | [`qa/guided/config/use-case-runners.json`](../guided/config/use-case-runners.json) |
| Batch runner script | [`qa/runners/use-cases/run-all-use-cases.mjs`](../runners/use-cases/run-all-use-cases.mjs) |

### Report files

| File | Description |
|------|-------------|
| **This report** | `qa/docs/use-case-runner-report-2026-07-09.md` |
| **Full terminal log** | `qa/data/uc-all-report.log` (~3132 lines) |

---

## Appendix — batch runner summary (verbatim)

```
Status   Duration  Slug
------------------------------------------------------------------------
TIMEOUT  20m 0s    placement-drive-full
         └─ Exceeded 1200s
TIMEOUT  20m 0s    internship-publish-hire
         └─ Exceeded 1200s
PASS     3m 33s    student-verified-first-app
FAIL     2m 7s     assessment-csv
         └─ (action error: page.waitForSelector: Timeout 20000ms exceeded.
FAIL     2m 38s    campus-partnership-posting
         └─ (action error: page.waitForSelector: Timeout 20000ms exceeded.
PASS     1m 34s    offer-accept-lock
PASS     1m 33s    assessment-update-online
PASS     56s       clarifications
PASS     1m 28s    interview-scheduling
PASS     2m 0s     full-time-job
PASS     1m 23s    employer-registration
PASS     1m 34s    password-reset
PASS     1m 18s    bulk-student-import
PASS     46s       sponsorship-receipt
PASS     1m 15s    interview-slot-notify
PASS     34s       email-delivery-audit
PASS     26s       communication-email-routing
PASS     37s       session-ads-toggle
PASS     51s       audit-report-export
PASS     1m 13s    login-support-feedback
PASS     43s       data-export-notice
PASS     42s       guest-engagement
PASS     1m 48s    college-internship-approve
PASS     54s       college-offers-upload
PASS     43s       admin-governance
PASS     2m 37s    internship-guides-feedback-supervisors
```
