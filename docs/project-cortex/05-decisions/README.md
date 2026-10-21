# Decisions

Locked for the first AWS setup. Details and commands stay in `07-operations/deployment.md` and the setup guide.

| Decision | Choice |
|----------|--------|
| Server | The existing InternSafar EC2. No new server |
| Database | The existing Postgres instance. No new database. The domain is the only difference |
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

File storage uses the bucket the current site already uses. The database login stays the existing one on that server. A separate Placement Hub login is not a new server or a new database, and it is not part of this setup.

Still open: what happens to the Vercel site after AWS is up.
