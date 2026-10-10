# Guided Runner — quick start (partial automated testing)

**Bookmark this file or open in the app:** [Developer](/developer) → Developer notes (Landing → Developer notes).

**Bookmark this file.** When you return in a month, run from the **app folder**:

```powershell
cd C:\Users\sandeep\Downloads\Claudes\CampusPlacement\campus-placement
```

---

## Folder layout (2026-06)

| Path | Contents |
|------|----------|
| `qa/docs/` | QA markdown (this file, manual test playbook) |
| `qa/runners/batch/` | Windows `.bat` / `.ps1` launchers |
| `qa/runners/guided/` | Node runner scripts (`run-guided.mjs`, voice, db-log) |
| `qa/guided/config/` | JSON manifests (use cases, focus areas) |
| `qa/guided/playbooks/` | One JSON per E2E flow |
| `qa/data/voice/` | TTS transcripts (`.txt`), audio, manifest |
| `qa/data/catalogs/` | CSV inventories & session logs |
| `qa/tests/` | Playwright automation |

See also [`qa/README.md`](../README.md).

---

## Three commands you need

| Step | Command | What it does |
|------|---------|----------------|
| 0 | `npm run dev` | Start the app (leave running in terminal 1) |
| 1 | `npm run test:guided:help` | Print this cheat sheet in the terminal |
| 2 | Pick a playbook below | Run in terminal 2 |

---

## Playbooks (partial flows — run only what you need)

List all playbooks:

```powershell
npm run test:guided:playbook-list
```

| When you want to test… | Command | Focus Areas |
|------------------------|---------|-------------|
| **Full internship cycle** (Employer → College → Student → Employer) | `npm run test:guided:playbook-e2e` | All roles, ~40 steps, one GT- marker |
| **Full placement drive cycle** | `npm run test:guided:playbook-drives-e2e` | DRV-E04→S10, one GT- marker |
| **Employer requests drive** (+ college approve) | `npm run test:guided:playbook-drives` | DRV-E04, E05, C03 |
| **Student apply → employer select** (after drive request) | `npm run test:guided:playbook-drives-apply` | DRV-C03, S04, E12, E13 |
| **Employer publishes internship** (form fill + publish + college approve) | `npm run test:guided:playbook` | EI-02, EI-03, CI-01 |
| **College approve → student apply → employer select** (after publish) | `npm run test:guided:playbook-apply` | CI-01, SI-04, EI-15, EI-16, SI-09 |
| **Split E2E** (two sessions) | Run **publish**, then **apply** | Reuses SQLite marker |

### Auto + voice (YouTube / screen recordings — no clicks)

One-time voice deps:

```powershell
pip install -r qa/data/requirements/requirements-voice.txt
```

| Flow | Command | Batch file |
|------|---------|------------|
| Full internship E2E + narration | `npm run test:guided:playbook-e2e-auto-voice` | `qa\runners\batch\run_internship_e2e_auto_voice.bat` |
| Employer publish only | `npm run test:guided:playbook-auto` | `qa\runners\batch\run_internship_publish_auto_voice.bat` |
| Apply + select only | `npm run test:guided:playbook-apply-auto` | `qa\runners\batch\run_internship_apply_auto_voice.bat` |
| Guides, supervisors & feedback (after Select) | `npm run test:guided:voice-internship-care` | `qa\runners\batch\run_internship_care_auto_voice.bat` |
| Auto without voice | `npm run test:guided:playbook-e2e-auto` | — |

Transcripts and MP3s land in `qa/data/voice/` (import `.txt` files from `qa/data/voice/transcripts/` into ElevenLabs, Murf, or SonexLabs Pāṇini if you re-record).

**Voice engine** — edit `qa/guided/config/guided-voice-config.json`:

| Engine | Cost | Quality | Notes |
|--------|------|---------|-------|
| `edge_tts` (default) | Free | Good | Microsoft neural — **not** Windows SAPI. Default: `en-IN-NeerjaNeural` |
| `openai` | ~$0.015/min | Very good | Set `"engine": "openai"`, `"voice_id": "nova"`, env `OPENAI_API_KEY` |
| `sonexlabs` | 10k chars free | Premium (beta) | Pāṇini TTS API — works for **any** narration, not only phone AI. [sonexlabs.com](https://www.sonexlabs.com/) |
| `transcript_only` | Free | — | Writes `.txt` only; batch in ElevenLabs / SonexLabs dashboard |

List Edge voices: `edge-tts --list-voices | findstr en-IN`

For smoother playback during OBS recordings, install [ffmpeg](https://ffmpeg.org/) so `ffplay` can block until each clip finishes (otherwise Windows estimates duration).

### All Developer Notes use cases (auto + voice by slug)

Every row on **Developer notes → Use cases** (and More / User testing pages) has a voice runner:

```powershell
npm run test:guided:voice -- placement-drive-full
npm run test:guided:voice -- internship-publish-hire
npm run test:guided:voice-list   # all 24 slugs
```

Windows batch (same as internship bats, any slug):

```powershell
qa\runners\batch\run_use_case_auto_voice.bat assessment-csv
qa\runners\batch\run_use_case_auto_voice.bat internship-guides-feedback-supervisors
```

| Slug type | Playbook source |
|-----------|-----------------|
| `internship-publish-hire`, `placement-drive-full`, `college-internship-approve` | Full E2E playbooks (automated form fill + approve) |
| All other slugs | Navigation tours + manual pauses (14s) for on-screen actions |

Regenerate tour JSON after editing `qa/guided/config/use-case-tours.json`:

```powershell
npm run test:guided:build-uc-playbooks
```

One-off partnership setup (if campuses empty):

```powershell
# IIT Madras × every employer
npm run qa:ensure-partnership

# TechCorp (hr@techcorp.com) × all active colleges — internship playbook / EI-15
npm run qa:ensure-techcorp-partnerships
```

Or in the app: **Data entry** → **Campus tie-ups** → **Ensure IIT Madras tie-up (all employers)**.

---

## How the runner works (you control pace)

1. Run the npm command — **a browser window opens automatically**. That is the only window you need.
2. Read step instructions in the **terminal**.
3. When the **blue screen tag** top-right pulses, click once — or press **Alt+Enter**.
4. Automation runs; when the tag pulses again, read the next step and click once.
5. You decide pass/fail; optional manual notes in `qa/data/catalogs/manual_session_log.csv`.

---

## How steps are recorded (SQLite — laptop only)

Everything for guided testing is stored in one local file:

```
db/sqlite/guided_testing.sqlite
```

| Table | Purpose |
|-------|---------|
| `guided_session` | Active run, playbook id, session marker (`GT-…`) |
| `guided_step_state` | Current step, armed/running, click ack |
| `guided_step_log` | Every event: `session_start`, `armed`, `clicked`, `running`, … |

View the log anytime:

```powershell
npm run qa:guided:db-log
```

The browser reads/writes the same DB through `/api/guided-runner` (dev/sandbox only). Playwright writes directly to the file.

---

## Employer form fields (2026-06)

**Internships** (`Post Internship`): use **Start date** + **End date** (segmented DD/MM/YYYY), not a duration dropdown. Guided playbooks use **1 Jul 2026** → **31 Dec 2026**. Set **Batch year** to **2026** (matches seeded students). **Eligible branches**: `All` unless testing branch filters.

**College approve (required before students see a posting):** Internships list → filter **Pending review** → **Approve for campus** (green check icon on the row).

**Placement drives** (`Request placement drive`): drive date uses segmented fields; fill **Role & openings**, **Job description**, **Eligibility** (min CGPA, batch **2026**), and **Compensation** before submit. Playbooks automate these steps.

---

## College approval (required before students browse)

**Internships:** After employer publish, listings appear on **College → Internships & Programs** with **Campus = Pending review**. Approve before students see them (migration `067`).

**Placement drives:** After employer **Submit request**, college approves on **College → Placement Drives** (status **Awaiting Approval** → **Approved**). Students only see **approved** or **scheduled** drives.

Automated playbooks search for the session marker (`GT-…`) and click **Approve for campus** on the matching row (skipped if already approved).

---

## Session marker (links publish → apply playbooks)

- Publish playbook creates a title like `GT-20260529T1530 Summer Data Intern`.
- Marker is saved in **`guided_session.marker`** in SQLite (survives browser restarts on your laptop).
- Apply playbook reads that marker so it finds the same internship.
- Override: `$env:PH_GUIDED_MARKER="GT-..."; npm run test:guided:playbook-apply`

---

## Demo logins (password `Admin@123`)

| Role | Email |
|------|-------|
| Employer | `hr@techcorp.com` |
| College admin | `admin@iitm.edu` |
| Student | `arjun.verma@iitm.edu` |

Seeded Data Tester users use `@placementhub.test`. System mail demos: **placementhub@yopmail.com** at [yopmail.com](https://yopmail.com/).

Assessment round updates (CSV or **Assessment Update Online**) do **not** send email — they appear on **Hiring Results Dashboard** (employer) and college **Hiring Assessment** (read-only). Audit Reports export can email a download link when SMTP is configured.

---

## Runner alerts — 2026-05-29 (assessment & menu)

- **Assessment uploads (CSV)** — tabs by opportunity type; **Export CSV** per tab (full applications); **CSV upload** only (no mapping dialog); round labels from **Assessment map**.
- **Assessment Update Online** — new menu item; tabbed inline edit of application round results.
- **Hiring Results Dashboard** — read-only employer summary (renamed from Hiring Assessment).
- **Upload offers (CSV)** — removed from sidebar; open from **Offers** page (`/offers-upload`).
- **Purge test data** — `/data-entry` only (not on employer/college dashboards).
- After menu edits: `npm run qa:sync-routes`

---

## Clean up test data

**Landing → Data** (`/data-entry`) → **Purge** section → Refresh → filter **Internships & programs** → purge `GT-*` and other sandbox rows.

Eligible: Data Tester API posts, `GT-*` titles, guided sandbox rows, seed ids `d1000000-*`.

---

## Legacy modes (navigation only — no form typing)

| Command | Use when |
|---------|----------|
| `npm run test:guided:internships` | Browse Focus Areas internship cases (no auto fill) |
| `npm run test:guided -- --focus EI-03` | Single case |
| `npm run test:guided -- --playbook <id>` | Any playbook JSON in `qa/guided/playbooks/` |

From parent folder (if you open repo at `CampusPlacement`):

```powershell
cd C:\Users\sandeep\Downloads\Claudes\CampusPlacement
.\qa\runners\batch\run-guided.ps1
```

---

## Related docs

- [`qa/docs/manual-test-playbook.md`](../docs/manual-test-playbook.md) — CSV upload/download, cross-view checks, session log
- `qa/guided/config/focus-areas.json` — all cases from Focus Areas.xlsx (rebuild: `npm run qa:build-focus-areas`)
- `qa/routes-by-role.js` — blank-screen / route smoke list (rebuild: `npm run qa:sync-routes` after menu changes)
- `qa/runners/batch/` — Windows launchers (see `qa/runners/batch/README.md`)
