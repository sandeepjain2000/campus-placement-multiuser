# Manual test playbook — PlacementHub

**Guided Runner (partial auto testing):** open **[Developer](/developer)** from the landing page (Developer → Developer notes), or see [`qa/docs/guided-runner-quickstart.md`](guided-runner-quickstart.md) / `npm run test:guided:help`.

**Run guided tests from the app folder:**

```powershell
cd C:\Users\sandeep\Downloads\Claudes\CampusPlacement\campus-placement
npm run test:guided:internships
```

Or from the parent `CampusPlacement` folder (where `Focus Areas.xlsx` lives):

```powershell
cd C:\Users\sandeep\Downloads\Claudes\CampusPlacement
.\run-guided.ps1 --section internships.employer
```

Keep `npm run dev` running in one terminal; run the guided runner in a **second** terminal.

Structured manual QA for **CSV upload/download** and **cross-view data consistency**. Use with `qa/data/catalogs/manual_session_log.csv` and `qa/data/catalogs/csv_screens_inventory.csv`.

---

## Before every session

1. **Pick one campus** and use it for the whole session (e.g. IITM — `admin@iitm.edu`).
2. **Session ID:** `MT-YYYYMMDD-A` (increment A→B if you run twice same day).
3. **Unique marker:** embed in titles, remarks, or company fields, e.g. `MT-20260529-A Offer Test`.
4. **Demo logins** (password `Admin@123` unless reset):

   | Role | Email |
   |------|-------|
   | Student | `arjun.verma@iitm.edu` |
   | College | `admin@iitm.edu` |
   | Employer | `hr@techcorp.com` |
   | Super admin | `admin@placementhub.com` |

5. Open `qa/data/catalogs/manual_session_log.csv` and fill the session header row.

---

## 90-minute session structure

| Phase | Time | Focus |
|-------|------|--------|
| 1 Smoke | 15 min | Login each role; hub + one list screen loads |
| 2 CSV upload | 25 min | One upload flow + 3 negative files |
| 3 CSV export | 15 min | Same area; export + 3-row UI compare |
| 4 Cross-view | 25 min | Entity × role matrix for session marker |
| 5 Log | 10 min | Pass/fail, evidence links, P0/P1/P2 |

**Rule:** One **entity type** per session (offers *or* assessments *or* students *or* drives). Depth beats breadth.

---

## CSV download checklist (C-2)

For each export screen (see `qa/data/catalogs/csv_screens_inventory.csv`):

1. Screen shows ≥2 rows (or note “empty list”).
2. Click **Export CSV** (or split-button menu if present).
3. File downloads without error toast.
4. Open CSV: header row present; encoding OK (names not garbled).
5. Row count ≈ UI row count (same filters).
6. **Spot-check 3 rows** — compare to on-screen values:

   - Name / roll / company  
   - Status  
   - Amount / CTC if shown  
   - Dates (format may differ; value should match)

7. Hard refresh page → export again → same sampled values.

**Pass:** 3/3 sampled fields match. **Fail:** log screen, field, UI value, CSV value.

---

## CSV upload checklist (C-5)

### Happy path

1. **Export CSV** from the app tab (assessments) or download **starter CSV** (offers) — do not invent columns.
2. Add 5–10 rows with **session marker** in remarks or title.
3. Upload → confirm **zero row errors** (or document expected partial rejects).
4. Open **post-upload verify route** from inventory (e.g. Offers list after Offers upload).
5. Search for marker — all rows visible after refresh.

### Negative cases (one file each, per upload type)

| Case | Expected |
|------|----------|
| Wrong/missing header | Clear error; no silent bad import |
| Duplicate roll number | Row-level error |
| Roll not in master list | Rejected with message |
| Headers only (empty data) | No crash; clear message |
| Non-CSV (.xlsx, .txt) | Blocked before upload |
| Overlong remarks (> limit) | Row rejected; valid rows OK |

### Round-trip (strongest test)

1. Download starter/export.  
2. Change one marked row.  
3. Upload.  
4. Re-export → changed value in CSV **and** UI.

---

## Cross-view consistency (C-3 / C-4)

After any create/upload/action, walk the **same record** across roles.

### Entity × role matrix (example: offer)

| Field | College Offers | Employer Offers | Student Offers |
|-------|----------------|-----------------|----------------|
| Student name | ✓ | ✓ | ✓ |
| Company | ✓ | ✓ | ✓ |
| Job title | ✓ | — | ✓ |
| Status | ✓ | ✓ | ✓ |
| CTC / amount | ✓ | ✓ | ✓ |
| Date | ✓ | ✓ | ✓ |

**Procedure**

1. Create/upload with marker + known status (e.g. `pending`).
2. Verify each cell in the matrix.
3. Change status (student accept / college edit).
4. Re-verify all cells — must match new status everywhere.

Repeat pattern for:

- Job post → college jobs → student jobs  
- Drive request → college approve → student drives  
- Application → employer applications → college applications  
- Assessment upload (CSV tab) or Assessment Update Online → Hiring Results Dashboard → college Hiring Assessment  

---

## Release sign-off (manual minimum)

Before calling a build tested:

- [ ] One **offer** CSV upload + cross-role matrix  
- [ ] One **assessment** flow: Export CSV tab → upload **or** Assessment Update Online → Hiring Results Dashboard  
- [ ] **Student import** if students module changed  
- [ ] **3 CSV exports** on touched screens  
- [ ] **2 transactional flows** with session marker  
- [ ] `qa/data/catalogs/manual_session_log.csv` completed for the session  

See also `qa/data/catalogs/uat_signoff_checklist_audit_and_assessments.csv` for audit/assessment-specific rows.

---

## Playbook mode (what you asked for)

The runner **types, clicks, and selects** like a tester. **You** decide if the result is correct.

Each micro-step:

1. Terminal prints Do / Observe for the step → click **Next →** on the app (bottom-right)
2. Watch the browser perform the action (typed text, clicks)
3. Panel says **Observe:** … → you validate → click **Continue →**
4. Next action

```bash
cd campus-placement
npm run test:guided:playbook
```

Or:

```bash
node qa/runners/guided/run-guided.mjs --playbook internships-employer-publish
```

Playbooks live in `qa/guided/playbooks/` (one file per flow). List them:

```bash
npm run test:guided:playbook-list
```

First playbook: **internships-employer-publish** — maps to Focus Areas **EI-02 + EI-03** (fill every form field, publish).

---

## Focus Areas section mode (navigation only — older)

`--section internships.employer` only logs in and opens pages; **you** fill forms manually. Use **playbook mode** instead for automated entry.

---

Source file: `../Focus Areas.xlsx` (parent folder) — **119 use cases** in two modules:

| Module | IDs | Roles |
|--------|-----|-------|
| **Internships** | EI-01…23, SI-01…15, CI-01…16 | Employer, Student, College |
| **Placement drives** | DRV-E01…24, DRV-S01…19, DRV-C01…22 | Employer, Student, College |

Imported into:

- `qa/guided/config/focus-areas.json` — step-by-step runner data
- `qa/data/catalogs/focus_areas_catalog.csv` — spreadsheet for testers (case ID, one-liner, command)

After editing the xlsx, rebuild:

```bash
npm run qa:build-focus-areas
```

### Run one Focus Area case (one step, Next to finish)

```bash
node qa/runners/guided/run-guided.mjs --focus EI-03
npm run test:guided:focus -- EI-03
```

### Run a whole role block (Next between each case)

```bash
node qa/runners/guided/run-guided.mjs --section internships.employer
node qa/runners/guided/run-guided.mjs --section internships
node qa/runners/guided/run-guided.mjs --section placement-drives.college
npm run test:guided:internships
npm run test:guided:drives
```

---

## Guided use-case runner (step-by-step, you validate)

For **manual testers**: one-line use cases, visible browser, **Next** button between steps.  
The runner navigates and logs in where it can; **you** complete forms/uploads and judge pass/fail.  
Log observations in `qa/data/catalogs/manual_session_log.csv`.

### List use cases

```bash
npm run test:guided:list
```

### Run end-to-end internship flow

```bash
npm run test:guided:internship
```

### Run any use case (UC-001 … UC-010)

```bash
node qa/runners/guided/run-guided.mjs --uc UC-002
node qa/runners/guided/run-guided.mjs --uc UC-007 --base-url https://campus-placement-omega.vercel.app
```

### On-screen controls

| Control | Action |
|---------|--------|
| **Next →** (bottom-right on app) | First click runs the step; second click advances |
| **N** key | Same as Next |
| **Skip use case** | Stop current flow |

Steps marked **Your turn** are manual — fill forms, upload CSV, click Apply, then Next.

Use case definitions: `qa/guided/config/use-cases.json` (edit to add flows).

---

## Running automation so you can **see** the browser

Playwright runs **headless** by default (no visible window). Use one of these from the project root:

### Recommended: Playwright UI (watch + pick tests)

```bash
npm run test:playwright:ui
```

Opens the Playwright UI: pick a test, watch the browser, step through, see traces.

### Visible browser (headed)

```bash
npm run test:playwright:headed
```

Runs smoke specs with Chromium **on screen**. Optional: slower motion on PowerShell:

```powershell
$env:PW_HEADED=1; npm run test:playwright:headed
```

### Single spec, visible

```bash
npm run test:blank-screens:headed
```

### Step-through debugger (pause on each action)

```bash
npm run test:playwright:debug
```

Then pick a test in the inspector; use Step Over to advance.

### After a run — HTML report (screenshots on failure)

```bash
npm run test:playwright:report
```

Opens the last report with failure screenshots and traces.

### Prerequisites

1. App reachable at `http://127.0.0.1:3000` — Playwright starts `npm run dev` automatically if not running.  
2. Seed/demo data loaded (same as manual tests).  
3. First time: `npx playwright install chromium`

### All npm test scripts

| Script | What it does |
|--------|----------------|
| `test:playwright:ui` | Interactive UI — best for “see what’s happening” |
| `test:playwright:headed` | Smoke specs, visible browser |
| `test:blank-screens:headed` | Blank-screen guard, visible browser |
| `test:playwright:debug` | Inspector, step-by-step |
| `test:playwright:report` | Open last HTML report |
| `test:smoke` | Headless smoke (blank-screens + auth) |
| `test:blank-screens` | Headless blank-screen guard only |

---

## Bug logging template

When logging a failure in `qa/data/catalogs/manual_session_log.csv`:

- **Session ID** and **marker**  
- **Role** and **route**  
- **Field** compared  
- **Expected** vs **actual**  
- **Evidence:** screenshot filename or CSV snippet  
- **Priority:** P0 (blocks demo) / P1 (wrong data) / P2 (polish)

---

## Related files

| File | Purpose |
|------|---------|
| `qa/data/catalogs/manual_session_log.csv` | Per-step log for each session |
| `qa/data/catalogs/csv_screens_inventory.csv` | Upload/export screens by role |
| `qa/data/results/C-*.json` | Detailed test case result dumps |
| `qa/data/catalogs/uat_signoff_checklist_audit_and_assessments.csv` | Audit & assessment sign-off |
| `qa/routes-by-role.js` | Dashboard routes for blank-screen automation |
