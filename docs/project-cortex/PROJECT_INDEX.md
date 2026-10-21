# Placement Hub — Project Cortex index

Entry point for agents working in `campus-placement-multiuser`. Not a product manual. The product manual is `docs/product/placementhub-functionality.md`.

**Last refresh:** 2026-10-19.

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
6. `https://placementhub.online/` and `https://www.placementhub.online/` stay on the existing homepage. AWS uses `https://app.placementhub.online/` on the same EC2 and the same database. The domain is the only difference.
7. InternSafar stays running on its current server. Placement Hub is added beside it. It does not replace that server, that database, or that public site.
