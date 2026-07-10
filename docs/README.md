# Documentation index

Markdown in this repo is grouped by purpose. **Root-level** `PRODUCT.md`, `DESIGN.md`, and `AGENTS.md` stay at the repo root for tooling (Impeccable, Cursor agents).

## Layout

| Path | Purpose |
|------|---------|
| [`PRODUCT.md`](../PRODUCT.md) | Product purpose, users, brand tone |
| [`DESIGN.md`](../DESIGN.md) | UI / design system principles |
| [`AGENTS.md`](../AGENTS.md) | Agent / contributor conventions |
| [`product/`](product/) | Feature overview & flows |
| [`help/`](help/) | In-app help export (sync via `npm run qa:sync-help-knowledge`) |
| [`archive/`](archive/) | Unrelated or legacy one-off documents (`.md`, `.txt`, `.docx`) |
| [`qa/docs/`](../qa/docs/) | Manual QA playbooks & guided runner docs |
| [`adhoc/`](../adhoc/) | Rarely used one-off scripts (debug, legacy seed, old DB runners) |
| [`scripts/`](../scripts/) | Frequent maintenance (`db:exec-sql-file`, seeds, audits) |
| [`qa2/reports/`](../qa2/reports/) | Batch Playwright / agent test result write-ups |

## Product & flows

- **[PlacementHub functionality](product/placementhub-functionality.md)** — roles, features, end-to-end journeys (Word: `product/placementhub-functionality.docx` via `python scripts/md_to_docx.py`)
- **[Campus placement user guide](product/campus-placement-system-user-document.docx)** — stakeholder user documentation (regenerate: `python generate_docs.py`)

## Archive (legacy / out of scope)

- [Attendance management SOP](archive/attendance-management-late-ptl-dsi-sop.md) · [Word copy](archive/attendance-management-late-ptl-dsi-sop.docx)

## Help library

See **[help/README.md](help/README.md)** for role-based help synced from `src/content/helpDocumentation.js`.

## QA testing

See **[qa/docs/README.md](../qa/docs/README.md)** for guided runner quick start and CSV manual test playbook.

## Diagrams

Mermaid sources: [`diagrams/`](diagrams/) — PNG export used by `scripts/md_to_docx.py`.
