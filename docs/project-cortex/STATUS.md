# Status

| Item | State | Last checked |
|------|--------|----------------|
| Cortex | Built for Placement Hub. Not a copy of InternSafar’s context pack | 2026-10-19 |
| App today | Vercel + Supabase. AWS setup not started | 2026-10-19 |
| Homepage | `https://placementhub.online/` answered. `https://www.placementhub.online/` redirected | 2026-10-19 |
| InternSafar on the shared server | Process online, port 3000 only, current release markers present, Node 22 | 2026-10-19 |
| Disk on that server | About 16 GB free of 29 GB. Enough for the setup guide’s 3 GB check | 2026-10-19 |
| Swap on that server | None at check time. The setup guide adds 4 GB swap when work starts. The server is not resized | 2026-10-19 |
| Old InternSafar code copies | Five previous app folders, about 1.1 GB each. Newest one is the rollback copy and stays. Older ones are redundant and are not blocking disk | 2026-10-19 |
| AWS guide | Placeholders only. Server backup instead of an RDS console snapshot. Rollback drops Placement Hub tables without CASCADE, then `sync_job_posting_is_visible` if it is unused. Filled-in values stay off GitHub | 2026-10-21 |
| File bucket | Checked from the server. No bucket policy, public access blocked, no CORS configuration. The repo file that allows public student reads is not applied | 2026-10-21 |

Coverage still thin: `01-product` points at the existing product manual instead of copying it. `04-contracts` and `08-quality` are pointers, not new inventories.
