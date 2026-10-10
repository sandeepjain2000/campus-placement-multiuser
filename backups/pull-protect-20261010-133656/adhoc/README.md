# Adhoc scripts (rarely used)

One-off debugging, legacy seed helpers, and old migration runners. **Not part of the Next.js app.**

For day-to-day work use [`scripts/`](../scripts/) (`npm run db:exec-sql-file`, seeds, audits, etc.).

## Layout

| Folder | Contents |
|--------|----------|
| [`debug/`](debug/) | DB/API checks (`check_*`, `inspect_*`, `test_*`) from early 2026 debugging |
| [`seed/`](seed/) | Legacy seed/prompt helpers (prefer `db/seed.sql`, `scripts/seed_*.js`) |
| [`db/`](db/) | Old SQL runners (prefer `npm run db:exec-sql-file`) |
| [`dev/`](dev/) | One-time file/HTML utilities |

## Run from repo root

```bash
node adhoc/debug/inspect_offers.js
node adhoc/seed/seed_clarifications.js
node adhoc/db/run_migration_034.js
```

Scripts call `adhoc/lib/repo-root` so `.env.local` and `db/` paths resolve correctly.

## Keep at repo root

`babel.config.js`, `jest.config.js`, `jest.setup.js`, `playwright.config.js` — required by test tooling.
