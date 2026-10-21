# Decisions

Locked for the first AWS setup. Details and commands stay in `07-operations/deployment.md` and the setup guide.

| Decision | Choice |
|----------|--------|
| Server, database, EC2 | The same server, the same database, and the same EC2. The only thing different is the domain |
| Public address | `https://app.placementhub.online/` |
| Homepage | `placementhub.online` and `www` stay on the current homepage |
| DNS | One A record for the subdomain, in Namecheap. Do not change `@` or `www` |
| Public IP | The server’s existing address. A second public IP is not required |
| Process | Placement Hub on port 3001. InternSafar stays on port 3000 |
| Memory | Add 4 GB swap for the build. Do not resize the server |
| Data | Scan Supabase first. Copy all rows only if the only accounts left are the owner’s core accounts and those accounts have no transactions. If the scan fails, stop |
| Undo | Placement Hub only. Do not restore the server backup or an RDS snapshot. Do not use `DROP TABLE ... CASCADE`. Also drop `sync_job_posting_is_visible` if nothing else uses it |
| Backup | A dump of the current database on the server, before any Placement Hub change. Not an RDS console snapshot. A Placement Hub-only dump comes only after those tables exist |
| Secrets in git | Placeholders in the guide and in Cortex. Filled-in values stay off GitHub |
| Mail during tests (2026-10-21) | Never run a test that sends mail to a bounce address. The 20 AWS core accounts already have `email_verified_at`, so sign-in does not send mail and those accounts stay as they are. A new registration still sends a verification email. Bounce deliveries: `arjun.verma@iitm.edu`, `test-notifications@nitt.edu`, `qa-create-check@placementhub.online`, `@campus-placement.work`. The other 18 deliver to `sandeepjain200019@gmail.com` |
| Core accounts (2026-10-21) | Do not test them. Test only with a genuine account. Leave them for a demo if one is required. A demo is expected on Vercel, not on AWS. No production process may touch them |

File storage stays on the bucket Placement Hub already uses. Do not create or change a bucket for this setup. The database login stays the existing one on that server. A separate Placement Hub login is not a new server or a new database, and it is not part of this setup.

Still open: what happens to the Vercel site after AWS is up.
