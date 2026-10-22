# Cortex changelog

Changes to this folder, not to the product.

## 2026-10-22

- `/` opens sign-in on AWS, Vercel, and local. The old Vercel demo landing is saved at `saved-demo-landing/page.js` and is not served.
- PlacementHub Vercel deploy is `deploy.bat` plus `.env.vercel.local` only. The account is `lawcarelegal20-6778`. There is no standing `.vercel` folder. InternSafar stays on `placementhubsupport-7197`.

## 2026-10-21

- Core accounts are not for testing. Tests use a genuine account. No production process may touch the 20 core accounts. A demo, if needed, is expected on Vercel.
- Recorded that sign-in does not send mail for the 20 AWS core accounts, and that tests must not send mail to a bounce address.
- Named `https://app.placementhub.online/` and the same EC2, server, and database.
- Replaced the RDS console snapshot step with a server dump taken before Placement Hub changes. A Placement Hub-only dump comes only after those tables exist.
- Rollback also drops `sync_job_posting_is_visible` when nothing else uses it.
- Deploy commit is whatever `git log -1` prints on `main`, not `dd6e3a5`.
- Recorded the live file-bucket check: no bucket policy, public access blocked, no CORS configuration.

## 2026-10-19

- Built Placement Hub Project Cortex from the InternSafar Cortex layout (numbered folders, index, decisions, operations, work hub).
- Kept the 2026-10-10 project-health notes where they already were.
- Recorded the AWS first-time plan in `07-operations/deployment.md`. No secret values.
