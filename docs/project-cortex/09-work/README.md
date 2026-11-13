# Work hub

Each piece of work gets a folder here once it starts. Project health is the catch-all for small UI notes.

| Folder | What it is |
|--------|------------|
| `project-health/` | `Known Gaps.md` and `Implementation Log.md` (UI audit from 2026-10-10, updated as items are fixed) |
| `2026-11-02-env-sync-push/` | AWS executed 2026-11-02 (`4ed6263…` + migration `117`, no account backfill). Vercel still pending. See `Implementation Plan.md` + `Implementation Log.md` |
| `2026-11-06-published-desc-push/` | AWS executed 2026-11-06 — `657ea3e` published description-save fix. **No schema / no backfill.** Vercel not in this pass. |
| `2026-11-13-aws-catchup/` | AWS executed 2026-11-13 — catch-up app pack from Vercel working tree. **No schema / no backfill.** See `Implementation Plan.md` + `Implementation Log.md`. |
| `2026-11-11-security-findings-remediation/` | Candidate security test verification (PH-01…PH-04 + zip screenshots). **Plan only — no fixes yet.** See `Implementation Plan.md`. |
| AWS first-time setup | Standing ops plan in `07-operations/deployment.md` (server/tables done 2026-10-21; app URL answers) |

## What a work folder contains

Minimum: a short plan, plus a log once code changes. Source notes go in `source/` inside that folder. Templates: `../templates/Feature Folder.md`.
