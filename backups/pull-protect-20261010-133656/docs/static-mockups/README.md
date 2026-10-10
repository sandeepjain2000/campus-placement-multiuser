# PlacementHub static mockups

Offline HTML mockups of dashboard screens for layout / stakeholder review. Not connected to the live database.

## Role Home / landing pages (mega-menu hub)

These match the live full-screen hub at `/dashboard/{role}`:

| Role | Open |
|------|------|
| Employer | [`employer.html`](employer.html) or [`pages/employer/home.html`](pages/employer/home.html) |
| Student | [`student.html`](student.html) or [`pages/student/home.html`](pages/student/home.html) |
| College Admin | [`college.html`](college.html) or [`pages/college/home.html`](pages/college/home.html) |
| Placement Committee | [`placement-committee.html`](placement-committee.html) or [`pages/placement-committee/home.html`](pages/placement-committee/home.html) |
| Super Admin | [`super-admin.html`](super-admin.html) or [`pages/super-admin/home.html`](pages/super-admin/home.html) |

Also: [`index.html`](index.html) lists all landings.

Aliases under each role folder: `landing.html`, and `dashboard-{role}.html` where it matches the live home path (e.g. `pages/employer/dashboard-employer.html`).

## Inner screens

Menu-linked screens live under `pages/{role}/` (tables, forms, empty states). From those pages, **Home** returns to that role’s landing.

## Regenerate menus / CSS / landings

After changing `src/config/dashboardMenu.js` or hub styles in `src/app/globals.css`:

```bash
node scripts/generate-static-mockup-menus.js
```

This refreshes `mockup-menus.js`, copies globals CSS, regenerates screen stubs, and rewrites role landing HTML.

## Local viewing tip

Open via a simple static server if the Lucide CDN is blocked on `file://`:

```bash
npx --yes serve docs/static-mockups
```
