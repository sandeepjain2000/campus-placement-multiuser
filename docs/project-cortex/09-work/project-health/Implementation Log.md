# Placement Hub — Implementation Log (project health)

App: `campus-placement-multiuser` (Placement Hub). Catch-all log for small fixes that belong to no feature folder.

Status of this file: **Cortex seed.** When Placement Hub Cortex is built (plan decision D6), copy to `campus-placement-multiuser/docs/project-cortex/09-work/project-health/Implementation Log.md`. Open items live in `Known Gaps.md` next to this file.

Entry format: `YYYY-MM-DD — <slice>`.

---

## 2026-10-10 — UI fix: student Browse Drives month filter clipped (BUG-009)

- **Where (as a user):** Student → Home → **Opportunities** → **Browse Drives** → month filter ("Any month"). Address: `/dashboard/student/drives`.
- **Symptom:** opening the month filter showed a cut-off month grid.
- **Cause:** The picker panel was absolutely positioned inside an AdminCN `Card`, which has `overflow-hidden`, so the card clipped it.
- **Change:** `src/components/MonthYearPicker.jsx` now uses the AdminCN `Popover` (`PopoverTrigger` with `render={<Button … />}`, `PopoverContent`), which portals above the page. IDs, labels, `aria-label`s and filter behaviour unchanged.
- **Checked:** lint passes on the picker and the drives page. In the browser, all 12 months, the year arrows and the panel edges show in full (panel flips above the button when the window is short).
- **Git:** not committed, not pushed.

## 2026-10-10 — UI fix: college Employers list repeated as cards after row 31 (BUG-010)

- **Where (as a user):** College admin → Home → **Employers & Partnerships** → **Employers**. Address: `/dashboard/college/employers`.
- **Symptom:** after the 31st row the same employers appeared again as cards, which looked like an unannounced switch to card view.
- **Cause:** The page renders a desktop table and a mobile-only card list. The card list had `flex … md:hidden`; the unlayered legacy rule `.flex { display: flex; }` in `src/app/globals.css` (line 5134) beat Tailwind's layered `md:hidden`, so the mobile list also showed on desktop.
- **Change:** `src/app/dashboard/college/employers/CollegeEmployersContent.jsx` puts `md:hidden` on its own wrapper without `flex`. `globals.css` left unchanged because legacy pages may depend on `.flex`. Searched the app: no other screen combines `flex` with a hide-on-desktop class.
- **Checked:** lint passes. Signed in as Admin (IITM), the table shows rows 1–31 then the footer; the hidden card list measures 0 height.
- **Git:** not committed, not pushed.

## 2026-10-10 — UI fix: college Interview Scheduling, Upcoming Slots buttons past the card edge (PH-UI-03)

- **Where (as a user):** College admin → Home → **Evaluation & Selection** → **Interview Scheduling** (page heading **Interviews**) → **Scheduling** tab → **Upcoming Slots** card. Address: `/dashboard/college/interviews`.
- **Symptom:** **Owner** and **Actions** (pencil "Edit", bin "Delete") sat past the card's right edge; the table scrolled sideways. On phones the pencil was ~500 px off-screen.
- **Cause:** table cells never wrap, and some slots store a long company name (for example "Indian Institute of Technology, Madras • Round 3 - HR interview"), so **Company & Round** grew to ~421 px. At 1280 px the card also shared the row with the **Create Interview Slot** form and got only ~568 px. Phones reuse the same page (the mobile view just renders the desktop one).
- **Background:** the original app had a separate phone layout with slot cards; the UI migration (commit 35a9b4c, 2026-08-17) replaced it with the desktop page, so phones got the overflowing table.
- **Change (one file, `src/app/dashboard/college/interviews/dt_Interviews.jsx`):**
  - **Laptops (1280 px and up):** form and Upcoming Slots stay side by side, as before. The Upcoming Slots card gets a slightly bigger share (column split 0.75 / 1.25 instead of 0.8 / 1.2, form ~25 px narrower at 1280 px). **Company & Round** (~144–224 px) and **Host** (~112–144 px) now wrap long text instead of stretching. **Owner** keeps its own column.
  - **1024–1279 px:** unchanged from before — Upcoming Slots full width under the form, table.
  - **Below 1024 px (phones, small tablets):** each slot is a stacked row (company, round, date · time, Owner badge, host) with the same pencil/bin buttons on the right, instead of the table. This restores what the original phone cards showed, except the "Assigned:" student list (not added back yet).
  - Same data, same Edit/Delete handlers, same loading and empty messages. No API or test-ID changes.
- **First attempt (same day, reverted):** side by side only from 1536 px. User flagged it added a lot of downward scrolling on laptops; replaced by the narrower columns above.
- **Checked:** lint passes. With 9 real slots, all 18 Edit/Delete buttons are inside the card and nothing scrolls sideways at 390, 1024, 1280, 1366 and 1536 px. At 1280 px the card (903 px tall) is shorter than the form beside it (942 px), so page length is unchanged from before. Edit from a stacked row fills the form ("Edit Interview Slot", FinEdge Systems) and highlights the row; **Cancel edit** returns to "Create Interview Slot". Nothing saved or deleted during the check.
- **Seen but not changed:** the floating **Help** button can sit over the last row's buttons at the bottom of the window (same as PH-UI-25).
- **Not changed:** the large gap between the card title and its description is PH-UI-04 (global `.grid` gap), still open.
- **Git:** not committed, not pushed.

## 2026-10-10 — Bugbot (UI only) on branch changes

- Bugbot found no UI bugs in branch changes, including the two fixes above. It reviewed 49 of 105 changed files; the 56 skipped were binaries in a backup folder. Bugbot only reviews the diff, so it does not cover untouched screens.

## 2026-10-10 — Whole-app UI audit (report only)

- 135 pages checked at 1280 px for every role, plus college admin, student and public pages at 390 px. About 30 issues logged as PH-UI-01 … PH-UI-30 in `Known Gaps.md`, each with menu steps using on-screen names. No code changed by the audit.
- Root cause worth fixing first: PH-UI-04 (wrong spacing almost everywhere, from an old `.grid` rule in `globals.css`), because it affects most pages and makes PH-UI-01 (employer Hiring Pipeline overlap) worse.
