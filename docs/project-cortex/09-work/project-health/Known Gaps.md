# Placement Hub — Known Gaps

App: `campus-placement-multiuser` (Placement Hub). Not InternSafar.

Status of this file: **Cortex seed.** Project Cortex for Placement Hub is not built yet (plan decision D6 is open). When it is, copy this file to `campus-placement-multiuser/docs/project-cortex/09-work/project-health/Known Gaps.md`. Until then this is the dated backlog.

Each entry is dated with the day it was found. Status values: `OPEN`, `FIXED <date>`, `DECIDED-NOT-NOW`.

**Naming rule for this file:** steps use the names a user sees on screen (menu items, page headings, tabs, card titles, column headers, button text). Icon-only buttons are described by their icon plus the tooltip shown on hover, if any. The web address is given only as a fallback. Code file names appear only in the "Where in code" notes for developers.

---

## 2026-10-10 — UI audit (report only, nothing fixed below unless marked)

**Scope checked:** 135 dashboard/public pages across every role at laptop width (1280 px), plus college admin, student and public pages at phone width (390 px). Automated layout checks in the browser, with screenshots for the items marked *confirmed*.

**Not covered:** detail pages opened from a row (they need an ID in the address), dialogs and menus once opened, dark mode, employer and Super Admin pages at phone width.

### How to sign in and move around

1. Run Placement Hub (`npm run dev` in `campus-placement-multiuser`). On 2026-10-10 it ran on port 3001 because InternSafar was on 3000.
2. Open the login page (`http://localhost:3001/login`), click **Demo accounts**, click **Use →** on the role below, then **Sign In**.
3. **College admin, Employer, Student:** after sign-in you land on **Home**, which shows one card per menu group (for example **Evaluation & Selection**). Click the item inside the card. The left sidebar then shows that group's items. Click **Home** at the top of the sidebar to pick another group.
4. **Super Admin:** the left sidebar lists every group and item at once.
5. **Phone width:** in Chrome press F12, turn on the device toolbar and pick a 390 px wide phone.

| Role | Demo account to pick |
|---|---|
| College admin | Admin (IITM) — Rajesh Kumar |
| Employer | TechCorp Solutions — Anita Desai |
| Super Admin | Super Admin |
| Student | Arjun Verma |

### A. Broken or unreadable

**PH-UI-02 — FIXED 2026-10-16 — Super Admin — Placement listings name columns were cut too short**
- **Go to:** sidebar **Platform Directory** → **Placement listings**. Scroll to the **All listings** card.
- **Was:** **Title**, **Employer**, and **College(s)** were cut to a few letters while spare width sat in the short columns. **Posted** did not run off the card.
- **Now:** those name columns use the spare width. A name still ends in **…** only when it is longer than the wider column.
- Fallback address: `/dashboard/admin/placement-listings`

**PH-UI-03 — FIXED 2026-10-10 — College admin — Upcoming Slots table pushes Edit/Delete out of the card** (see Implementation Log 2026-10-10; details below are the original report)
- **Go to:** Home → **Evaluation & Selection** → **Interview Scheduling**. The page heading reads **Interviews**. Stay on the **Scheduling** tab (selected by default). Find the card titled **Upcoming Slots**: on a wide window it sits to the right of the **Create Interview Slot** form; on a narrower window it is below the form.
- **You see:** the table's columns are **Company & Round**, **Schedule**, **Host**, **Owner**, **Actions**. **Company & Round** is very wide (~421 px), so **Owner** (the "TPO"/"Company" badge) and **Actions** (a pencil icon, hover "Edit", and a bin icon, hover "Delete") sit past the card's right edge. A host name such as "Prof. Venkat Subramanian" runs into the edge. At phone width the pencil is ~500 px off-screen.
- **Note:** this page only has slots if some exist. If the card says "No interview slots scheduled yet.", create one with the **Create Interview Slot** form first.
- Fallback address: `/dashboard/college/interviews`

### B. Row action buttons pushed past the card edge (laptop width; you must scroll the table sideways)

**PH-UI-07 — FIXED 2026-10-16 — College admin — Employers phone card cut Approved**
- **Go to:** Home → **Employers & Partnerships** → **Employers**. Narrow the window to a phone (the check used iPhone SE, 375 px wide).
- **Was:** the green badge was cut to **Appro**.
- **Now:** the badge shows **Approved**. The long email shortens instead.
- **Desktop:** not this bug. On a wide window the table already showed the full badge.
- Fallback address: `/dashboard/college/employers`

**PH-UI-08 — OPEN — College admin — Custom Message Templates**
- **Go to:** Home → **Communication & Support** → **Custom Message Templates**.
- **You see:** text in the **Variables** column spills out of its cell.
- Fallback address: `/dashboard/college/message-templates`

**PH-UI-09 — OPEN — Employer — Campus Partnerships**
- **Go to:** Home → **Core / Overview** → **Campus Partnerships**.
- **You see:** the eye icon at the end of each college row (hover "View details for <college name>") is ~208 px past the card edge.
- Fallback address: `/dashboard/employer/select-campus`

**PH-UI-10 — OPEN — Employer — Startup seed funding**
- **Go to:** Home → **Organization Management** → **Startup Seed Funding**.
- **You see:** the **Inquire** button is ~36 px past the card edge.
- Fallback address: `/dashboard/employer/startup-funding`

**PH-UI-11 — OPEN — Super Admin — Email logs**
- **Go to:** sidebar **Operations & Risk** → **Email logs**. Scroll to the **Delivery history** card.
- **You see:** the **Actions** column's eye icon (no hover text) is ~329 px off. Email addresses in **Recipient (login)** run over the next column.
- Fallback address: `/dashboard/admin/email-logs`

**PH-UI-12 — OPEN — Super Admin — Error logs**
- **Go to:** sidebar **Operations & Risk** → **Error logs**. Scroll to the **Diagnostics** card.
- **You see:** the **Actions** column's eye icon (no hover text) is ~148 px off. Text in the **Route** column spills.
- Fallback address: `/dashboard/admin/error-logs`

**PH-UI-13 — OPEN — Super Admin — Marketplace**
- **Go to:** sidebar **Platform Directory** → **Marketplace**. Stay on the **Providers** tab and scroll to the **Providers (N)** card.
- **You see:** the **Edit** button is ~156 px past the card edge.
- Fallback address: `/dashboard/admin/marketplace`

### C. Phone width only (390 px)

**PH-UI-14 — OPEN — College admin — Infrastructure**
- **Go to:** Home → **Administration** → **Infrastructure**. Find the **Campus resources** card.
- **You see:** the bin icon at the end of each resource row (no hover text) is off-screen.
- Fallback address: `/dashboard/college/infrastructure`

**PH-UI-15 — OPEN — College admin — Marketplace**
- **Go to:** Home → **Employers & Partnerships** → **Marketplace**. Find the **Catalog** card.
- **You see:** the **Notes** column's "Optional note" box is off-screen.
- Fallback address: `/dashboard/college/marketplace`

**PH-UI-16 — OPEN — College admin — Add Student**
- **Go to:** Home → **Students & Applications** → **Add Student**.
- **You see:** the tab row (Identity, Academic, Demographics, **Placement**, Profile, Preferences) is cut off at **Placement**.
- Fallback address: `/dashboard/college/students/add`

**PH-UI-17 — OPEN — College admin — Calendar**
- **Go to:** Home → **Engagement** → **Calendar** (page heading **Placement calendar**).
- **You see:** the **Next →** button below the month grid is clipped.
- Fallback address: `/dashboard/college/calendar`

**PH-UI-18 — OPEN — Any role — Help documentation page**
- **Go to:** click the round **Help** button at the bottom-right of any dashboard page, then click **Open full help documentation**.
- **You see:** the **Help & Documentation** title overflows its banner.
- Fallback address: `/dashboard/help`

**PH-UI-19 — OPEN — Student — Alerts**
- **Go to:** Home → **Communication** → **Notifications / Alerts** (page heading **Inbox & alerts**).
- **You see:** the star icon on each alert (hover "Star this alert") is clipped by ~6 px.
- Fallback address: `/dashboard/alerts`

### D. Wrong or odd text and visuals

**PH-UI-20 — OPEN (confirmed) — Employer — typo on Employer settings**
- **Go to:** Home → **Settings** → **Campus Posting Limits** (page heading **Employer settings**).
- **You see:** "All 7 approved **college s** can receive internships **.**" (stray spaces).
- **Where in code:** line break inside the sentence at `src/app/dashboard/employer/settings/page.js` lines 206–207.
- Fallback address: `/dashboard/employer/settings`

**PH-UI-21 — OPEN (confirmed) — Super Admin — wrong header subtitle**
- **Go to:** any Super Admin page.
- **You see:** the top header reads "PlacementHub SuperAdmin" with the subtitle **"College Administration"**.

**PH-UI-22 — OPEN (confirmed, data not code) — Signed out — support phone looks wrong**
- **Go to:** the login page (signed out).
- **You see:** the support phone reads "+91 80000 12345688889".
- **Fix:** correct the saved value at Super Admin sidebar **Operations & Risk** → **Settings** → Support phone. The built-in default is "+91 80000 12345".

**PH-UI-23 — OPEN (confirmed) — College admin — invisible count on Calendar filter**
- **Go to:** Home → **Engagement** → **Calendar** (**Placement calendar**). Look at the category chips above the calendar (All, Placement, …).
- **You see:** on the selected **All** chip, the count bubble is blank (white on blue).

**PH-UI-24 — OPEN (confirmed) — Employer — empty logo circle**
- **Go to:** any Employer page. Look at the company card at the bottom of the sidebar and the header.
- **You see:** TechCorp's logo is an empty white circle.

**PH-UI-25 — OPEN — Employer — floating Help button on Employer settings**
- **Go to:** Home → **Settings** → **Campus Posting Limits** (page heading **Employer settings**). Scroll to the bottom.
- **You see:** the round **Help** button at the bottom-right covers a Save button.
- **Dashboard:** disproven 2026-10-16. On **Welcome, TechCorp Solutions**, **View All Pipeline** is fully visible and the Help button does not cover it.

**PH-UI-26 — OPEN (confirmed) — Employer — heavy dashed border on empty page**
- **Go to:** Home → **Candidate Pipeline** → **Shortlisted / Unavailable (FCFS)** (page heading **Unavailable candidates (FCFS)**).
- **You see:** the empty-state box has a heavy black dashed border.

**PH-UI-29 — OPEN — Employer — campus dropdown text cut**
- **Go to:** Home → **Recruitment & Selection** → **Interview Scheduling**. In the **Create Slot** card, look at **College / campus**.
- **You see:** the selected college name is cut mid-word with no "…".
- **Also on:** the **Alumni Interview Scheduling** page. No menu item or button links to it; it can only be opened by typing the address `/dashboard/employer/alumni/interviews`.

### E. Dev only

**PH-UI-30 — OPEN (dev only) — every page while running `npm run dev`**
- **You see:** a red "1 Issue" badge in the bottom-left corner (a Next.js hydration warning). Not shown in production.
- **Where in code:** the `<script nonce>` in `src/app/layout.js` (line 31).

---

## 2026-10-10 — Functional (not UI)

**PH-FN-01 — DECIDED-NOT-NOW — Employer — Hiring Results Dashboard ignores "Selected" candidates**
- **Go to:** Home → **Recruitment & Selection** → **Hiring Results Dashboard**.
- **You see:** a college where TechCorp has a candidate marked **Selected** does not appear as an option.
- **Why:** this page only shows results uploaded via **Assessment Uploads (CSV)** or entered in **Assessment Update Online**. It does not read candidate statuses from **Applications**. TechCorp has partnerships with 7 colleges and 0 uploads, so the list is empty.
- **Where in code:** `src/app/api/employer/hiring-assessment-view/route.js` + `src/lib/assessmentHiringView.js` read only `employer_assessment_uploads` / `employer_assessment_rows`.
- **Decision 2026-10-10:** making it show pipeline selections is a functional change (API + data source). The user chose not to add an explanatory line on the page for now.
- Fallback address: `/dashboard/employer/hiring-assessment`

---

## Disproven on 2026-10-16 (removed from the open list)

Checked on screen. The described problem was not there.

- **PH-UI-01** — Employer **Hiring Pipeline**. **APPLIED**, **SHORTLISTED**, **INTERVIEW**, and **SELECTED** sit inside their boxes.
- **PH-UI-04** — College admin **Interviews** tiles. The gap between **Total Slots**, **Scheduled by TPO**, and **Scheduled by Company** looks even. The tiles were later shortened in height at the user's request; that was a separate change.
- **PH-UI-05** — College admin **Applications**. The eye icon in **Actions** sits inside the card.
- **PH-UI-06** — College admin **Students**. **Computer Science & Engineering** stays in the **Degree** cell. The eye, pencil, and bin icons sit inside the card.
- **PH-UI-25 (dashboard only)** — Employer **Welcome, TechCorp Solutions**. **View All Pipeline** is fully visible. The round **Help** button does not cover it. The **Employer settings** half of this note is still open.
- **PH-UI-27** — Employer **Recruitment Snapshot** and Super Admin **Placement listings** number tiles. They use the same rounded cards as the rest of the page, not black borders or typewriter numbers.
- **PH-UI-28** — College admin **Students** toolbar. The search hint includes **degree**, **Sort by** is a normal dropdown, and **Import CSV** / **Export CSV** are not the old orange buttons.

## Fixed on 2026-10-10 (kept here so the gap history is complete)

**PH-UI-F01 — FIXED 2026-10-10 — Student — Browse Drives month filter cut off**
- **Go to:** Home → **Opportunities** → **Browse Drives**. Click the month filter ("Any month").
- **Was:** the month grid was cut off inside the filter card. **Now:** it opens fully above the page. See Implementation Log 2026-10-10 (BUG-009).

**PH-UI-03 — FIXED 2026-10-10 — College admin — Upcoming Slots (Interview Scheduling)**
- **Go to:** Home → **Evaluation & Selection** → **Interview Scheduling** → **Scheduling** tab → **Upcoming Slots** card.
- **Was:** Owner and the pencil/bin buttons sat past the card's right edge. **Now:** they stay inside the card at every width. See Implementation Log 2026-10-10.

**PH-UI-F02 — FIXED 2026-10-10 — College admin — Employers list repeated as cards after row 31**
- **Go to:** Home → **Employers & Partnerships** → **Employers**.
- **Was:** after the 31st row, the same employers appeared again as cards, which looked like an unannounced switch to card view. **Now:** the table ends at row 31, followed by the footer. See Implementation Log 2026-10-10 (BUG-010).
