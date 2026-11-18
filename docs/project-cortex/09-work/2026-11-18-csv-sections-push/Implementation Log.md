# Implementation Log — 2026-11-18 PlacementHub CSV Sections push

## 2026-11-18 — Vercel + AWS production (PlacementHub only)

- **Scope:** Vercel production + AWS (`https://app.placementhub.online/`). No schema SQL. InternSafar not restarted. No core-account / bounce-mail tests.
- **Ship source:** git `02055bf` (GitHub `main`).
- **Archive:** `aws deploy/push-2026-11-18-ph/placementhub-20261118-1502.tar.gz` (sha256 `89DAC4B1A9F1BCBE0288E5B90C65F28BF568F3AAE60DD06641BA84F930FC662D`, ~51.5 MB; excluded nested `internship-portal`, `backups`, `admincn-free`, `.env*`).
- **Vercel:** `deploy.ps1` → `dpl_A1vK1S99yGsEopTboqvfC4N2EiEF`, aliased `https://campus-placement-omega.vercel.app`.

### Schema

- **No migration. No blank-fill.**

### App swap

- Staging: extract → copy live `.env` → `npm ci` + `NODE_OPTIONS=--max-old-space-size=1536 npm run build` → `BLOCK2_OK`.
- Live swap: old folder `~/placementhub-old-20261118-0942`; `pm2 restart placementhub --update-env` only.
- InternSafar: same PID `206368`, not restarted.

### Verification

| Check | Result |
|-------|--------|
| `placementhub` online | Yes (pid 241303) |
| `internsafar` online, same PID | Yes (`206368`) |
| Marker `void g('Sections')` | Present |
| Marker Sections export-only comment | Present |
| Marker Verified=`Yes` before `3/6` | Present |
| Marker `Karthik Iyer` | Present |
| `https://app.placementhub.online/login` | 200 |
| `https://internsafar.com/` | 200 |
| `https://placementhub.online/` | 200 |
| Core accounts / bounce mail | Not run |

### Disk

- Root ~60% after reclaim (tar removed). Rollback folders kept including `20261114` and `20261118`.

### Issues from this change

None found in automated smoke. College re-download of Students → Template recommended for Verified=Yes sample.
