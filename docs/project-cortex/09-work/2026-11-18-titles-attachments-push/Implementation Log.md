# Implementation Log — 2026-11-18 titles + create attachments AWS push

## 2026-11-18 evening — AWS production execute (PlacementHub only)

- **Scope:** AWS only (`https://app.placementhub.online/`). No schema SQL. InternSafar not restarted.
- **Ship source:** git `9b4d38d` (GitHub `main`). Prior AWS tip earlier same day: `02055bf` (CSV Sections).
- **Archive:** `aws deploy/push-2026-11-18-ph-titles/placementhub-20261118-1739.tar.gz` (~138 MB; removed from EC2 after swap).

### Schema

- **No migration. No blank-fill.**

### Disk prune (before pack extract)

- Removed older PH rollback `~/placementhub-old-20261118-0942` (~2.3G) first.
- Left InternSafar rollback `~/internship-portal-old-20261104115812` (only IS rollback; not touched).
- Disk after prune: ~45% used / ~16G free.

### App swap

- Staging: extract → copy live `.env` → `npm ci` + build → `BLOCK2_OK`.
- Live swap: old folder `~/placementhub-old-20261118-1218`; `pm2 restart placementhub --update-env` only.
- InternSafar: same PID `206368`, not restarted.
- Upload tar deleted after swap. Disk ~54% / ~13G free. Only one PH rollback kept.

### Product shipped in this tip

- Truncated hub/card titles get native browser tooltip (`TruncationTitleEnhancer`).
- Employer Projects: attach PDF/images on **create** (pending files uploaded after posting id exists).

### Verification

| Check | Result |
|-------|--------|
| `placementhub` online | Yes (pid 242992) |
| `internsafar` online, same PID | Yes (`206368`) |
| Marker `TruncationTitleEnhancer.jsx` | Present |
| Marker `pendingAttachments` | Present |
| `https://app.placementhub.online/login` | 200 |
| `https://internsafar.com/` | 200 |

### Issues

None found in automated smoke.
