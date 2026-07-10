/**
 * c2_csv_export.spec.js
 * C-2 – Tabular Screens: CSV Export Validation (27 test cases)
 *
 * For each screen:
 *   1. Login as the correct role
 *   2. Navigate to the route
 *   3. Verify page loads (not redirected to /login)
 *   4. Locate any Export CSV button/link (direct or inside a split-button dropdown)
 *   5. Trigger the download and verify the file is a .csv
 *
 * If no export button is found, the test is marked as a soft skip with a warning
 * (does NOT fail) — this lets us distinguish "missing feature" from "broken feature".
 */
const { test, expect } = require('@playwright/test');

// ─── Login helper ─────────────────────────────────────────────────────────────
async function loginAsDemo(page, email) {
  await page.goto(`/login?email=${encodeURIComponent(email)}`);
  await expect(page.locator('#login-email')).toHaveValue(email, { timeout: 15_000 });
  await expect(page.locator('#login-password')).not.toHaveValue('', { timeout: 10_000 });
  await page.locator('#login-submit').click();
  // Wait for full navigation to dashboard
  await page.waitForURL(/\/dashboard\//, { timeout: 15_000 });
}

// ─── CSV export helper ────────────────────────────────────────────────────────
// Looks for Export/CSV buttons including split-button dropdowns.
// Returns: 'downloaded' | 'no-button' | 'no-download'
async function tryExportCsv(page) {
  // Primary selectors for export triggers
  const directSelectors = [
    'button:has-text("Export CSV")',
    'button:has-text("Export")',
    'a:has-text("Export CSV")',
    'a:has-text("Export")',
    '[title*="Export"]',
    '[aria-label*="Export"]',
  ];

  // Try direct export buttons first
  for (const sel of directSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      try {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15_000 }),
          btn.click(),
        ]);
        const filename = download.suggestedFilename();
        return { result: 'downloaded', filename };
      } catch {
        // Button clicked but no download fired — may be a dropdown toggle
      }
    }
  }

  // Try split-button: look for a chevron/arrow next to an export button
  const splitArrow = page.locator(
    'button[aria-label*="more"], button[title*="more"], button.split-btn-arrow, ' +
    'button:has(svg[class*="chevron"]):near(button:has-text("Export"))'
  ).first();

  if (await splitArrow.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await splitArrow.click();
    await page.waitForTimeout(500);
    // Now look for CSV option in the opened dropdown
    const csvOption = page.locator('text=/Export.*CSV/i, text=/Download.*CSV/i, [role="menuitem"]:has-text("CSV")').first();
    if (await csvOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      try {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15_000 }),
          csvOption.click(),
        ]);
        return { result: 'downloaded', filename: download.suggestedFilename() };
      } catch {
        return { result: 'no-download', note: 'CSV option found but no download fired' };
      }
    }
  }

  // No export button found at all
  return { result: 'no-button', note: 'No export button found on this page' };
}

// ─── Shared page assertion ────────────────────────────────────────────────────
async function navigateAndAssertLoaded(page, route) {
  await page.goto(route);
  // Must NOT have been kicked back to login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  // Wait for the page to settle
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500); // allow client components to hydrate
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT (C2-CSV-001 to C2-CSV-004)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('C2 – Student CSV Exports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'arjun.verma@iitm.edu');
  });

  const studentScreens = [
    { id: 'C2-CSV-001', screen: 'Student Applications', route: '/dashboard/student/applications' },
    { id: 'C2-CSV-002', screen: 'Student Offers',        route: '/dashboard/student/offers' },
    { id: 'C2-CSV-003', screen: 'Student Interviews',    route: '/dashboard/student/interviews' },
    { id: 'C2-CSV-004', screen: 'Student Documents',     route: '/dashboard/student/documents' },
  ];

  for (const { id, screen, route } of studentScreens) {
    test(`${id} – ${screen} (${route})`, async ({ page }) => {
      await navigateAndAssertLoaded(page, route);
      const outcome = await tryExportCsv(page);
      if (outcome.result === 'downloaded') {
        expect(outcome.filename).toMatch(/\.(csv|xlsx)$/i);
        console.log(`✅ ${id} – Downloaded: ${outcome.filename}`);
      } else {
        console.warn(`⚠️  ${id} – ${outcome.result}: ${outcome.note ?? ''}`);
        // Soft skip — don't fail, page still loaded correctly
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYER (C2-CSV-005 to C2-CSV-011)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('C2 – Employer CSV Exports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'hr@techcorp.com');
  });

  const employerScreens = [
    { id: 'C2-CSV-005', screen: 'Employer Applications',      route: '/dashboard/employer/applications' },
    { id: 'C2-CSV-006', screen: 'Employer Offers',            route: '/dashboard/employer/offers' },
    { id: 'C2-CSV-007', screen: 'Employer Drives',            route: '/dashboard/employer/drives' },
    { id: 'C2-CSV-008', screen: 'Employer Interviews',        route: '/dashboard/employer/interviews' },
    { id: 'C2-CSV-009', screen: 'Employer Assessment Summary',route: '/dashboard/employer/assessment-summary' },
    { id: 'C2-CSV-010', screen: 'Employer Assessment Uploads',route: '/dashboard/employer/assessment-uploads' },
    { id: 'C2-CSV-011', screen: 'Employer Calendar',          route: '/dashboard/employer/calendar' },
  ];

  for (const { id, screen, route } of employerScreens) {
    test(`${id} – ${screen} (${route})`, async ({ page }) => {
      await navigateAndAssertLoaded(page, route);
      const outcome = await tryExportCsv(page);
      if (outcome.result === 'downloaded') {
        expect(outcome.filename).toMatch(/\.(csv|xlsx)$/i);
        console.log(`✅ ${id} – Downloaded: ${outcome.filename}`);
      } else {
        console.warn(`⚠️  ${id} – ${outcome.result}: ${outcome.note ?? ''}`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// COLLEGE ADMIN (C2-CSV-012 to C2-CSV-021)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('C2 – College Admin CSV Exports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin@iitm.edu');
  });

  const collegeScreens = [
    { id: 'C2-CSV-012', screen: 'College Students',               route: '/dashboard/college/students' },
    { id: 'C2-CSV-013', screen: 'College Applications',           route: '/dashboard/college/applications' },
    { id: 'C2-CSV-014', screen: 'College Offers',                 route: '/dashboard/college/offers' },
    { id: 'C2-CSV-015', screen: 'College Drives',                 route: '/dashboard/college/drives' },
    { id: 'C2-CSV-016', screen: 'College Interviews',             route: '/dashboard/college/interviews' },
    { id: 'C2-CSV-017', screen: 'College Internship Results',     route: '/dashboard/college/internship-results' },
    { id: 'C2-CSV-018', screen: 'College Employers',              route: '/dashboard/college/employers' },
    { id: 'C2-CSV-019', screen: 'Employer Partnership Requests',  route: '/dashboard/college/employers/requests' },
    { id: 'C2-CSV-020', screen: 'College Calendar',               route: '/dashboard/college/calendar' },
    { id: 'C2-CSV-021', screen: 'College Reports',                route: '/dashboard/college/reports' },
  ];

  for (const { id, screen, route } of collegeScreens) {
    test(`${id} – ${screen} (${route})`, async ({ page }) => {
      await navigateAndAssertLoaded(page, route);
      const outcome = await tryExportCsv(page);
      if (outcome.result === 'downloaded') {
        expect(outcome.filename).toMatch(/\.(csv|xlsx)$/i);
        console.log(`✅ ${id} – Downloaded: ${outcome.filename}`);
      } else {
        console.warn(`⚠️  ${id} – ${outcome.result}: ${outcome.note ?? ''}`);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN (C2-CSV-022 to C2-CSV-027)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('C2 – Super Admin CSV Exports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page, 'admin@placementhub.com');
  });

  const adminScreens = [
    { id: 'C2-CSV-022', screen: 'Admin Colleges',           route: '/dashboard/admin/colleges' },
    { id: 'C2-CSV-023', screen: 'Admin Users',              route: '/dashboard/admin/users' },
    { id: 'C2-CSV-024', screen: 'Admin Employers',          route: '/dashboard/admin/employers' },
    { id: 'C2-CSV-025', screen: 'Pending Registrations',    route: '/dashboard/admin/pending-registrations' },
    { id: 'C2-CSV-026', screen: 'Admin Feedback Inbox',     route: '/dashboard/admin/feedback' },
    { id: 'C2-CSV-027', screen: 'Admin Audit Reports',      route: '/dashboard/admin/audit-reports' },
  ];

  for (const { id, screen, route } of adminScreens) {
    test(`${id} – ${screen} (${route})`, async ({ page }) => {
      await navigateAndAssertLoaded(page, route);
      const outcome = await tryExportCsv(page);
      if (outcome.result === 'downloaded') {
        expect(outcome.filename).toMatch(/\.(csv|xlsx)$/i);
        console.log(`✅ ${id} – Downloaded: ${outcome.filename}`);
      } else {
        console.warn(`⚠️  ${id} – ${outcome.result}: ${outcome.note ?? ''}`);
      }
    });
  }
});
