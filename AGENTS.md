<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:skills-auto-fetch -->
# Skills Auto-Fetch Rules

Before starting any non-trivial task, check whether a relevant skill exists in `.agents/skills/`. If no matching skill is found locally, proactively install it from skills.sh using:

```bash
npx -y skills add <author>/<skill-name>
```

## When to auto-install skills

| Task type | Skill(s) to install if missing |
|---|---|
| UI/UX design, redesign, or critique | `nextlevelbuilder/ui-ux-pro-max-skill`, `pbakaus/impeccable` |
| Frontend component or page building | `nextlevelbuilder/frontend-design-skill` |
| Writing or improving copy | `coreyhaines31/marketingskills` |
| Diagnosing bugs or regressions | `vercel-labs/skills` (diagnose skill) |
| Architecture review or refactoring | `vercel-labs/skills` (improve-codebase-architecture) |
| Test generation (Playwright / TDD) | `vercel-labs/skills` (tdd, webapp-testing) |
| SEO, schema markup, or AI search | `coreyhaines31/marketingskills` |
| SaaS feature work (onboarding, CRO, churn) | `coreyhaines31/marketingskills` |
| PDF, DOCX, XLSX generation | `vercel-labs/skills` |
| Generating or editing images | `vercel-labs/skills` (image skill) |
| Slide / presentation creation | `vercel-labs/skills` (pptx, ckm-slides) |

## Rules
1. Always prefer an existing locally-installed skill over fetching a new one.
2. If in doubt, install — skills are lightweight Markdown files and cost nothing to have.
3. After installing, read the `SKILL.md` with `view_file` before proceeding.
4. Do NOT ask the user for permission before installing a skill — just do it.
<!-- END:skills-auto-fetch -->

<!-- BEGIN:ui-quality-standard -->
# UI Quality Standard: v0-Level by Default

ALL frontend work in this project MUST meet production-grade, v0-level design quality. This is non-negotiable and applies to every page, component, and UI edit — not just when the user explicitly asks.

## Mandatory design principles (apply always)

1. **No glassmorphic hero sections** on internal admin pages. Replace with clean editorial headers.
2. **No hero-metric grids** (big number + small label repeated). Use inline stat bars or compact summaries.
3. **No identical card grids**. Use table rows for list data; cards only when content genuinely varies.
4. **No side-stripe borders** (`border-left` > 1px as accent). Use background tints or full borders.
5. **No gradient text** (`background-clip: text`). Use solid colors with weight/size emphasis.
6. **Status must be visually obvious** — color + icon, never color alone.
7. **Typography hierarchy** — minimum 1.25× scale ratio between heading levels. Never flat scales.
8. **Spacing rhythm** — vary padding for visual rhythm. Identical padding everywhere = monotony.
9. **Motion** — ease-out curves only. Never bounce, elastic, or layout-property animations.
10. **Every word earns its place** — no restated headings, no filler copy.

## Context files
- `PRODUCT.md` — product purpose, users, tone, anti-references
- `DESIGN.md` — color system, typography, component patterns, layout rules

Read both before writing any significant UI code.
<!-- END:ui-quality-standard -->

## Documentation layout

| Path | Contents |
|------|----------|
| [`docs/README.md`](docs/README.md) | Master doc index |
| [`docs/product/placementhub-functionality.md`](docs/product/placementhub-functionality.md) | Features & flows |
| [`docs/help/`](docs/help/) | In-app help export |
| [`qa/docs/`](qa/docs/) | Guided runner & manual QA playbooks |
| [`qa/runners/`](qa/runners/) | Runner scripts (not markdown) |
