# AWS first-time setup — plan for 2026-10-19

Status: **not started.** This is the plan. The runnable steps are the Word guide. No server change was made while writing this page.

## What must stay up

- `https://placementhub.online/` keeps showing the existing homepage.
- `https://www.placementhub.online/` keeps its current DNS. On 2026-10-19 it redirected and the apex name answered.
- InternSafar stays online on port 3000. Do not restart it, stop all processes, reboot, or resize the server.
- The guide is not published on the homepage. It stays in the repo and in Downloads.

## Where it runs

It will be the same server, and it will be the same database and the same EC2. The only thing different is the domain: `https://app.placementhub.online/`.

- InternSafar: existing public address → Nginx → port 3000.
- Placement Hub: subdomain → the same public address → Nginx → port 3001.
- Nginx chooses by the requested name.
- One new A record, for the subdomain only, in Namecheap (Domain List → Manage `placementhub.online` → Advanced DNS). Host is the label only, such as `app`. Value is the existing address, written in the guide as `<ELASTIC_IP>`.
- Do not change `@`, `www`, or the nameservers. Do not also add the name in Route 53.

The owner does not need a new AWS account login for these steps. Namecheap is required for the DNS record. Secret values are typed on the server, not into this file.

File storage stays on the bucket Placement Hub already uses on Vercel. InternSafar uses that same bucket. Do not create a new bucket, and do not change its policy or CORS for this setup. Checked from the server on 2026-10-21: no bucket policy, public access blocked, no CORS configuration. `s3-student-read.json` is not applied. Leave the bucket as it is.

## Order of work

1. Leave the homepage DNS alone.
2. Use `https://app.placementhub.online/`.
3. Use the existing server. No second public IP.
4. Own folder and settings. The public URL is `https://app.placementhub.online/`. Pack the commit `git log -1` prints on `main`. Do not pack `dd6e3a5`.
5. Create Placement Hub tables. Do not copy Supabase rows yet.
6. Scan Supabase. Copy every row only if the only accounts left are the core accounts the owner lists, and every activity count is zero. If that is not true, stop.
7. Build with extra swap memory. Do not resize.
8. Start Placement Hub on port 3001 beside InternSafar on 3000.
9. Add the one Namecheap A record.
10. Turn on HTTPS for the subdomain only.
11. Check the subdomain app, the homepage, and InternSafar.

## Server check before starting (read-only, 2026-10-19)

| Check | Result |
|-------|--------|
| InternSafar process | Online. Only port 3000 is listening. Port 3001 is free |
| Release | Live app contains the current release markers (“Finish internship”, “Currently hired”). Node is 22 |
| Disk | About 16 GB free of 29 GB. The guide’s minimum is 3 GB free |
| Swap | Off. Add the guide’s 4 GB swap when setup starts. Do not resize |
| Homepage and InternSafar | Both answered |

### Old project copies — decision

The home folder has the live app, the latest upload archive, and **five** older full copies of the InternSafar app (about 1.1 GB each). The newest old copy is the rollback copy from today’s InternSafar deploy. **Keep it.**

The four older copies are redundant project code. They are not required for Placement Hub, and they are not filling the disk. **Do not delete them before setup.** Database JSON backups are small. Settings backups are tiny and must not be copied into git. Leave both.

Before any Placement Hub change, take one dump of the current database on the server. That is the baseline. It is not an RDS console snapshot. Do not restore it to undo Placement Hub. A Placement Hub-only dump is taken only after those tables exist, and before their data is loaded. Do not thin older backups first.

## Data and undo

- Schema comes from the Supabase table list in the guide, not from replaying every migration.
- After a full copy, still reset platform settings, because the copied row is QA data.
- Do not also insert a SuperAdmin or load a reference-only file after a successful full copy.
- Rollback removes only Placement Hub: subdomain DNS, its Nginx site, its process, its schedule line, and its tables.
- Do not restore the whole database snapshot. That would roll InternSafar back too.
- Do not use `DROP TABLE ... CASCADE`. The guide checks foreign keys and views first, then drops only Placement Hub tables inside one transaction. It then drops `sync_job_posting_is_visible` if nothing else still uses it. If the drop fails, nothing is committed.
- Leave the swap file, a shared file bucket, and any key that InternSafar or the homepage still uses.
- Keep the renamed code folder (`chmod 700`) until the checks pass. It contains settings.
- Confirm InternSafar’s table list, its user count, and a real sign-in. A homepage response alone is not enough.

The drop script has not been run. Placement Hub’s tables are not on that database yet, so there is nothing to test it against.

## GitHub

The guide already on GitHub uses placeholders and has no secrets. Its rollback text is older than the file on this PC and in Downloads.

If Ctrl+H is used to put real values into the guide, that updated file is not pushed.
