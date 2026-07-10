# Clean up & restore test data

> **Section:** Developer / QA  
> **Source:** developer  
> **Audience:** all

## Overview

After testing, wipe all jobs, internships, and placement drives, then restore demo tie-ups. Core logins (IITM / NITT / BITS + TechCorp) stay intact.

## Full wipe (recommended)

```bash
npm run db:clear-placement
```

Or: `node scripts/clear_all_placement_data.js`

Hard-deletes every job posting (jobs + internships + projects + hackathons), all placement drives, applications, campus visibility, offers, and assessment uploads. Includes items created by demo accounts and Guided Runner GT-* posts. Does **not** remove colleges, users, students, or employers.

**When:** Clean slate before a demo or after a long QA session.

## Restore after wipe

1. **Restore demo campus ↔ employer tie-ups** — Landing → Demo APIs → Campus tie-ups → **Restore all demo tie-ups**  
   Or: `POST /api/demo/ensure-all-tieups` with body `{ "scope": "demo" }`  
   Approves IIT Madras, NITT Trichy, and BITS Pilani with TechCorp, GlobalSoft, Infosys, Innovent Labs, and FinEdge. Safe to re-run.

2. **Seed fresh postings (optional)** — Landing → Demo APIs → Create jobs / Create internships

3. **All colleges × all employers (full grid, optional)** — `POST /api/demo/ensure-all-tieups` with `{ "scope": "all" }` or `npm run qa:ensure-partnership`

## Partial cleanup (UI)

- **Soft-delete jobs & internships only** — Landing → Demo APIs → Jobs & internships → Delete all jobs & internships (`POST /api/demo/purge-all-jobs-internships`). May miss standalone drives; prefer full wipe above.

- **Selective purge (one row)** — Landing → Demo APIs → **Cleanup (purge)** or `/data-entry` Purge section. Soft-delete single sandbox rows: Data Tester API posts, GT-* titles, playbook `Duration: N months.` descriptions, seed ids `d1000000-*`.

## Remove test college tenants

```bash
py -3 scripts/delete_test_college_tenants.py --dry-run
py -3 scripts/delete_test_college_tenants.py
```

Deletes colleges created during registration tests (MIT WPU, COEP, duplicate IITM, etc.). Keeps `iit-madras`, `nit-trichy`, `bits-pilani` only.

## Remove test employers (keep 5 demo accounts)

```bash
py -3 scripts/delete_test_employers.py --dry-run
py -3 scripts/delete_test_employers.py
```

Hard-deletes every **employer profile** whose login email is **not** one of the core demo employers below. Cascades jobs, drives, campus tie-ups, offers, and assessment data for those companies. Also removes orphan `employer` users with no profile (registration QA).

**Kept (same as `/demo-accounts` → Employers):**

| Company | Login |
|---------|--------|
| TechCorp Solutions | `hr@techcorp.com` |
| GlobalSoft Technologies | `hr@globalsoft.com` |
| Infosys Limited | `hr@infosys.com` |
| Innovent Labs | `talent@innoventlabs.ai` |
| FinEdge Systems | `careers@finedge.io` |

Other seeded employers (e.g. GreenVolt, DataQuotient, NITT academic, BITS alumni) are **removed** unless you add their emails to the protect list in `scripts/delete_test_employers.py`.

**When:** Employer list on `/demo-accounts` or Super Admin → Manage Employers is cluttered with registration / QA companies.

**After:** Run **Restore all demo tie-ups** if you removed employers that had approved campus partnerships you still need for demos.

## Related

- SQL: `db/scripts/clear_all_placement_data.sql`
- In-app docs: `/developer#cleanup`
