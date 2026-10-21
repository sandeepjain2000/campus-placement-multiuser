# Cortex changelog

Changes to this folder, not to the product.

## 2026-10-21

- Named `https://app.placementhub.online/` and the same EC2, server, and database.
- Replaced the RDS console snapshot step with a server dump taken before Placement Hub changes. A Placement Hub-only dump comes only after those tables exist.
- Rollback also drops `sync_job_posting_is_visible` when nothing else uses it.
- Deploy commit is whatever `git log -1` prints on `main`, not `dd6e3a5`.
- Recorded the live file-bucket check: no bucket policy, public access blocked, no CORS configuration.

## 2026-10-19

- Built Placement Hub Project Cortex from the InternSafar Cortex layout (numbered folders, index, decisions, operations, work hub).
- Kept the 2026-10-10 project-health notes where they already were.
- Recorded the AWS first-time plan in `07-operations/deployment.md`. No secret values.
