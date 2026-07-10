# PlacementHub Design System

## Color Strategy: Restrained + Committed accents

### Base palette (CSS vars already in globals.css)
- Primary: indigo family (--primary-50 through --primary-900)
- Backgrounds: --bg-primary, --bg-secondary, --bg-elevated
- Borders: --border-default, --border-strong
- Text: --text-primary, --text-secondary, --text-tertiary
- Status: success (green), warning (amber), danger (red), info (blue)

### Status color semantics (critical — never swap)
- `requested` → amber / warning (needs action)
- `approved` → blue / info (confirmed, not yet live)  
- `scheduled` → indigo / primary (upcoming)
- `in_progress` → green accent (live now)
- `completed` → slate/muted green (done)
- `cancelled` → red/muted (terminal)

## Typography
- Headings: System font stack or Inter (already loaded)
- Mono: --font-mono for IDs, roll numbers, system codes
- Scale: 2.25rem h1 → 1.5rem h2 → 1.125rem h3 → 0.9rem body → 0.75rem meta
- Weight contrast: 800 heading, 600 label, 400 body

## Layout Principles
- Page max-width: 1280px with 1.5rem side padding (via .page-content class)
- Section spacing: 2rem between major sections, 1.25rem between cards
- Use table rows for list data, not identical cards
- Inline status pills — no sidebar stripes
- Action buttons: primary for approve, ghost+danger-tint for reject

## Components
- `.card`: white elevated surface, border, radius-xl, no drop shadow overkill
- `.badge`: pill shape, colored backgrounds, used for status and tags  
- `.btn .btn-primary`: indigo filled; `.btn-ghost`: transparent with border
- `.data-table`: full-width table with striped bg-secondary rows
- `.form-select`, `.form-input`: consistent border-radius and focus ring

## Motion
- Page transitions: fadeIn 0.2s ease
- Card expand: slideDown 0.25s ease-out
- Hover: background shift 0.15s, no transform/scale on data rows
- Never animate layout-affecting properties

## Do Not
- Glassmorphic hero sections on internal admin pages
- Gradient text
- Side-stripe colored borders on cards
- Nested cards
- Hero-metric grids (big number + tiny label)
