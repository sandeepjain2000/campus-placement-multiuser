# Placement Hub — Project Cortex index

Entry point for agents working in `campus-placement-multiuser`. Not a product manual. The product manual is `docs/product/placementhub-functionality.md`.

**Last refresh:** 2026-10-22.

## What this product is

Placement Hub is a multi-tenant campus placement platform (package `campus-placement`). Students, college admins, and employers share one system. A super admin runs the platform. Colleges are tenants. Employers can partner with more than one college.

Today the running app is Vercel + Supabase. The first AWS setup is planned, not started. See `07-operations/deployment.md`.

## Which tree to edit

| Role | Path |
|------|------|
| Edit this product | `campus-placement-multiuser/` |
| InternSafar (separate app) | Sibling `internship-portal/` |
| Frozen — do not edit | `campus-placement-multiuser/internship-portal/` |

## Where to go next

| Need | File |
|------|------|
| Product behaviour | `01-product/README.md` → `docs/product/placementhub-functionality.md` |
| Stack | `02-architecture/stack-and-environments.md` |
| Folders | `03-codebase/README.md` |
| Locked choices | `05-decisions/README.md` |
| AWS setup plan (2026-10-19) | `07-operations/deployment.md` |
| Open UI notes | `09-work/project-health/Known Gaps.md` |
| How to update Cortex | `06-workflows/Documentation Maintenance.md` |
| Secrets rule | `AGENTS.md` and `cortex.toml` |

## Hard constraints

1. Do not edit the nested `internship-portal` folder.
2. Do not blank `.env`, `.env.local`, or `.env.*`.
3. Do not commit or push unless the user asks in that message.
4. Do not put secret values in this folder. It is pushed with the app.
5. Do not publish this Cortex, or the AWS guide, as a page on `https://placementhub.online/`.
6. `https://placementhub.online/` and `https://www.placementhub.online/` stay on the existing homepage. It will be the same server, the same database, and the same EC2. The only thing different is the domain: `https://app.placementhub.online/`.
7. InternSafar stays running on its current server. Placement Hub is added beside it. It does not replace that server, that database, or that public site.
8. **No bounce-causing mail (2026-10-21).** Never run a test, script, or manual step that sends mail to an address that will bounce. Sign-in does not send mail. `src/lib/auth.js` only checks that `email_verified_at` is already stored. The 20 AWS core accounts already have that timestamp, so they can sign in without a message and do not need to be changed for login. A new registration still sends a verification email and blocks sign-in until the link is used. Known bounce deliveries: `arjun.verma@iitm.edu`, `test-notifications@nitt.edu`, `qa-create-check@placementhub.online`, and `@campus-placement.work`. The other 18 core accounts deliver to `sandeepjain200019@gmail.com`. Details: `08-quality/README.md`.
9. **Core accounts stay unused (2026-10-21).** Do not test the 20 core accounts. Test only with a genuine account. Leave the core accounts for a demo if one is required; a demo is expected on Vercel, not on AWS. No production process may touch them. Details: `08-quality/README.md`.
10. **Vercel deploy (2026-10-22).** PlacementHub and InternSafar are different Vercel accounts. Deploy PlacementHub only by running `deploy.bat` in this folder. It uses `.env.vercel.local` and the account `lawcarelegal20-6778`. Do not run `vercel`, `vercel ls`, or `vercel --prod` yourself. Do not read or create `.vercel\project.json`. A GitHub push does not deploy this app. InternSafar uses its own `deploy.bat` and the account `placementhubsupport-7197`.
11. **Home is sign-in (2026-10-22).** `/` opens the sign-in page on AWS, Vercel, and local. The Vercel demo landing, including the YOPmail Demo Emails line and Developer Notes, is saved at `saved-demo-landing/page.js` and is not a route. Do not put that page back on `/`.
