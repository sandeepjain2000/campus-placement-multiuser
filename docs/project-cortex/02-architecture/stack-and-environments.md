# Stack and environments

Confirmed from `package.json` and the AWS setup guide. No secret values.

| Area | Choice |
|------|--------|
| App | Next.js (`src/app`), React, JavaScript |
| UI | Tailwind, shadcn / AdminCN components already in the app. Tailwind Preflight is omitted (`src/styles/shadcn.css`) so legacy `globals.css` stays in charge; raw `<button>`s keep UA borders unless reset. Admin directory name controls use `.admin-entity-name-btn` in `globals.css` |
| Database today | Supabase Postgres |
| Files | S3 when configured. Exact bucket choice is still open for AWS |
| Mail | Email provider configured in server settings. Do not put the vendor name on screens |

| Host | Database | Notes |
|------|----------|--------|
| Local `npm run dev` | Supabase from `.env.local` | Do not blank that file |
| Vercel | Supabase | Current public app host |
| AWS (not started) | Same Postgres instance InternSafar already uses | Placement Hub tables use plain names. InternSafar tables use `ip_` / `ism_` prefixes |

AWS does not get a new server or a new database. See `07-operations/deployment.md`.
