# Placement Hub — Project Cortex

This folder is the AI project map for **Placement Hub** (`campus-placement-multiuser`). It follows the same shape as the InternSafar Cortex plan: one project, numbered folders, live code wins, and a deny-list for secrets.

It is not the application. It is not InternSafar’s `docs/ai-context/` pack. InternSafar stays in the sibling `internship-portal` repo.

| Property | Value |
|----------|--------|
| Lives at | `campus-placement-multiuser/docs/project-cortex/` |
| App to edit | `campus-placement-multiuser/` |
| Do not edit | `campus-placement-multiuser/internship-portal/` (frozen nested InternSafar copy) |
| Git | Tracked with this app. Safe to push only while it contains no secret values |
| Built | 2026-10-19 |

## Read order

```text
README.md
  → PROJECT_INDEX.md
  → the one numbered folder the task needs
  → live source under src/, db/, qa/
```

Do not load every folder up front.

## Folder map

| Path | Purpose |
|------|---------|
| `01-product/` | What the product is and who uses it |
| `02-architecture/` | Stack and environment split |
| `03-codebase/` | Where files live |
| `04-contracts/` | Route and API inventories, when one exists |
| `05-decisions/` | Locked choices |
| `06-workflows/` | How to change docs and code |
| `07-operations/` | Deploy and rollback. Today’s AWS plan is here |
| `08-quality/` | Testing pointers |
| `09-work/` | Dated health notes and one folder per piece of work |
| `skills/` | Which skills to open |
| `templates/` | Shape of a new work folder |

## Secrets

Cortex never stores real passwords, keys, database URLs, server addresses, or SSH key paths. The AWS guide in the repo root keeps Ctrl+H placeholders. A copy with those placeholders filled in stays off GitHub.
