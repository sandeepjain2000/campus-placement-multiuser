/**
 * Execute one UI action (no assertions). Used by guided playbooks.
 */
import { DEMO_SEED_PASSWORD } from '../../../src/lib/demoLogins.js';

export function resolveTemplate(value, ctx) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] ?? '');
}

/** React controlled inputs — fill() alone often does not update state. */
async function fillReactField(page, selector, value) {
  const field = page.locator(selector);
  await field.waitFor({ state: 'visible', timeout: 20_000 });
  await field.click({ timeout: 10_000 });
  await field.fill('', { timeout: 10_000 });
  await field.pressSequentially(String(value), { delay: 40 });
}

/** DD/MM/YYYY segmented fields (internship dates, drive date). */
async function fillSegmentedDateField(page, action, ctx) {
  const raw = resolveTemplate(action.value, ctx);
  const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`fillSegmentedDate expects YYYY-MM-DD, got "${raw}"`);
  const [, year, month, day] = match;

  let group;
  if (action.nearLabel) {
    const labelText = resolveTemplate(action.nearLabel, ctx);
    group = page
      .locator('.form-group')
      .filter({ hasText: labelText })
      .locator('[role="group"]')
      .first();
  } else if (action.ariaLabel) {
    group = page.getByRole('group', { name: resolveTemplate(action.ariaLabel, ctx) }).first();
  } else if (action.selector) {
    group = page.locator(action.selector).first();
  } else {
    throw new Error('fillSegmentedDate requires nearLabel, ariaLabel, or selector');
  }

  await group.waitFor({ state: 'visible', timeout: 15_000 });
  await group.scrollIntoViewIfNeeded().catch(() => {});

  const fillSegment = async (segLabel, segValue) => {
    const input = group.getByRole('textbox', { name: segLabel });
    await input.click({ timeout: 10_000 });
    await input.fill('');
    await input.pressSequentially(segValue, { delay: 40 });
  };

  await fillSegment('Day', day);
  await fillSegment('Month', month);
  await fillSegment('Year', year);
}

/** Fallback when guided-runner sign-in API is disabled (e.g. Vercel). */
async function uiLogin(page, baseUrl, email, password = DEMO_SEED_PASSWORD) {
  await page.goto(`${baseUrl}/login?email=${encodeURIComponent(email)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForSelector('#login-email', { timeout: 20_000 });
  const pwd = await page.locator('#login-password').inputValue();
  if (!pwd) await page.fill('#login-password', password);
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('#login-submit');
      return btn && !btn.disabled;
    },
    { timeout: 30_000 },
  );
  const captcha = page.locator('#login-captcha');
  if (await captcha.count()) {
    const current = await captcha.inputValue();
    if (!current) await captcha.fill('7');
  }
  await page.click('#login-submit');
  await page.waitForURL(/\/(dashboard|auth\/continue)/, { timeout: 90_000 });
  if (page.url().includes('/auth/continue')) {
    await page.waitForURL(/\/dashboard\//, { timeout: 90_000 });
  }
  console.log(`    → signed in via UI (${email})`);
  await page.waitForTimeout(400);
}

export async function executeAction(page, baseUrl, accounts, action, ctx) {
  if (!action?.type) return;

  const type = action.type;

  if (type === 'login') {
    const email = accounts[action.account];
    if (!email) return;
    const password = action.password || accounts.password || DEMO_SEED_PASSWORD;

    console.log(`    → login: ${email} (guided API)`);
    const signInRes = await page.request.post(`${baseUrl}/api/guided-runner/sign-in`, {
      data: { email, password },
    });
    const data = await signInRes.json().catch(() => ({}));
    if (!signInRes.ok() || !data.ok || !data.redirectTo) {
      const guidedErr = data.error || `Guided sign-in failed (${signInRes.status()})`;
      if (signInRes.status() === 403 || /disabled in this environment/i.test(String(guidedErr))) {
        console.log(`    → guided API unavailable — UI login fallback`);
        await uiLogin(page, baseUrl, email, password);
        return;
      }
      throw new Error(guidedErr);
    }

    await page.goto(`${baseUrl}${data.redirectTo}`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\//, { timeout: 30_000 });
    console.log(`    → signed in (${data.role || 'user'})`);
    await page.waitForTimeout(400);
    return;
  }

  if (type === 'goto') {
    const path = resolveTemplate(action.path, ctx);
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    return;
  }

  if (type === 'reload') {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    return;
  }

  if (type === 'wait') {
    await page.waitForTimeout(Number(action.ms) || 500);
    return;
  }

  if (type === 'click') {
    const delay = action.slow !== false ? 80 : 0;
    if (action.role && action.name) {
      await page.getByRole(action.role, { name: resolveTemplate(action.name, ctx) }).click({ timeout: 15_000, delay });
    } else if (action.text) {
      await page.getByText(resolveTemplate(action.text, ctx), { exact: !!action.exact }).first().click({ timeout: 15_000, delay });
    } else if (action.selector) {
      await page.locator(action.selector).first().click({ timeout: 15_000, delay });
    }
    await page.waitForTimeout(300);
    return;
  }

  if (type === 'fill' || type === 'type') {
    const value = resolveTemplate(action.value, ctx);
    const delay = type === 'type' && action.slow !== false ? 50 : 0;
    let locator;
    if (action.nearLabel) {
      locator = page
        .locator('.form-group')
        .filter({ hasText: resolveTemplate(action.nearLabel, ctx) })
        .locator('input, textarea, select')
        .first();
    } else if (action.label) {
      locator = page.getByLabel(resolveTemplate(action.label, ctx), { exact: false });
    } else if (action.placeholder) {
      locator = page.getByPlaceholder(resolveTemplate(action.placeholder, ctx));
    } else if (action.selector) {
      locator = page.locator(action.selector);
    }
    if (locator) {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
      await locator.click({ timeout: 10_000 }).catch(() => {});
      if (type === 'type') {
        await locator.press('Control+a').catch(() => locator.press('Meta+a').catch(() => {}));
        await locator.pressSequentially(value, { delay });
      } else {
        await locator.fill(value, { timeout: 10_000 });
      }
    }
    await page.waitForTimeout(250);
    return;
  }

  if (type === 'select') {
    const value = action.value != null ? resolveTemplate(action.value, ctx) : null;
    let locator;
    if (action.id) {
      locator = page.locator(`#${action.id}`);
    } else if (action.nearLabel) {
      const labelText = resolveTemplate(action.nearLabel, ctx);
      const byFor = page.locator(`label:has-text("${labelText}")`).locator('..').locator('select').first();
      if ((await byFor.count().catch(() => 0)) > 0) {
        locator = byFor;
      } else {
        locator = page
          .locator('.form-group')
          .filter({ hasText: labelText })
          .locator('select')
          .first();
      }
    } else if (action.label) {
      locator = page.getByLabel(resolveTemplate(action.label, ctx), { exact: false });
    } else {
      locator = page.locator(action.selector);
    }
    if (action.optionContains) {
      const needle = resolveTemplate(action.optionContains, ctx);
      const matchedValue = await locator.evaluate((sel, text) => {
        const opt = Array.from(sel.options).find((o) => o.text.includes(text) && o.value);
        return opt?.value || '';
      }, needle);
      if (!matchedValue) {
        throw new Error(`No select option contains "${needle}"`);
      }
      await locator.selectOption(matchedValue, { timeout: 10_000 });
    } else {
      await locator.selectOption(value, { timeout: 10_000 });
    }
    await page.waitForTimeout(250);
    return;
  }

  if (type === 'fillSegmentedDate') {
    await fillSegmentedDateField(page, action, ctx);
    await page.waitForTimeout(250);
    return;
  }

  if (type === 'clickInRow') {
    const rowText = resolveTemplate(action.rowText, ctx);
    const selectors = action.rowSelector ? [action.rowSelector] : ['tr', '.card.card-hover', '.card'];
    let row = null;
    for (const sel of selectors) {
      const candidate = page.locator(sel).filter({ hasText: rowText }).first();
      const count = await candidate.count().catch(() => 0);
      if (count > 0 && (await candidate.isVisible().catch(() => false))) {
        row = candidate;
        break;
      }
    }
    if (!row) {
      if (action.skipIfMissing) {
        console.warn(`    (skipped: no row matching "${rowText}")`);
        return;
      }
      throw new Error(`No row matching "${rowText}"`);
    }
    const buttonName = action.buttonName ? resolveTemplate(action.buttonName, ctx) : null;
    if (buttonName) {
      const candidates = [buttonName];
      if (buttonName === 'Approve') candidates.push('Approve for campus');
      let clicked = false;
      for (const name of candidates) {
        const btn = row.getByRole('button', { name }).first();
        const n = await btn.count().catch(() => 0);
        if (n > 0) {
          await btn.click({ timeout: 15_000 });
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        if (action.skipIfMissing) {
          console.warn(`    (skipped: no "${buttonName}" button in row "${rowText}")`);
          return;
        }
        throw new Error(`No button "${buttonName}" in row matching "${rowText}"`);
      }
      if (buttonName === 'Apply') {
        const dialog = page.getByRole('dialog').filter({ hasText: 'Choose CV for this application' });
        if (await dialog.isVisible({ timeout: 8000 }).catch(() => false)) {
          await dialog.getByRole('button', { name: 'Submit application' }).click({ timeout: 10_000 });
          await page.waitForTimeout(action.afterMs ?? 1200);
        }
      }
    } else if (action.role && action.name) {
      await row.getByRole(action.role, { name: resolveTemplate(action.name, ctx) }).first().click({ timeout: 15_000 });
    }
    await page.waitForTimeout(action.afterMs ?? 600);
    return;
  }

  if (type === 'clickFirst') {
    if (action.buttonName) {
      await page.getByRole('button', { name: resolveTemplate(action.buttonName, ctx) }).first().click({ timeout: 15_000 });
    } else if (action.text) {
      await page.getByText(resolveTemplate(action.text, ctx)).first().click({ timeout: 15_000 });
    }
    await page.waitForTimeout(300);
    return;
  }

  if (type === 'fillSearch') {
    const value = resolveTemplate(action.value, ctx);
    const placeholder = resolveTemplate(action.placeholder || 'Search', ctx);
    const input = page.getByPlaceholder(placeholder, { exact: false }).first();
    await input.click({ timeout: 10_000 }).catch(() => {});
    await input.fill(value, { timeout: 10_000 });
    await page.waitForTimeout(400);
    return;
  }

  if (type === 'uploadSampleCvs') {
    const { uploadSampleCvs } = await import('./cv-upload.mjs');
    console.log('    → uploadSampleCvs: docs/CVs/*.docx with manifest labels');
    const result = await uploadSampleCvs(page, baseUrl, {
      skipExistingLabels: action.skipExisting !== false,
      firstAsDefault: action.firstAsDefault !== false,
    });
    ctx.sampleCvsUploaded = result.uploaded.length;
    console.log(`    → uploaded ${result.uploaded.length}, skipped ${result.skipped.length}`);
    return;
  }

  if (type === 'downloadEmployerCvs' || type === 'downloadStudentCvs') {
    const { downloadEmployerApplicationCvs, downloadStudentOwnCvs } = await import('./cv-download.mjs');
    const limit = Number(action.limit) || 5;
    const marker =
      action.filterMarker === true || action.filterMarker === 'true'
        ? resolveTemplate(action.marker || '{{marker}}', ctx)
        : action.marker
          ? resolveTemplate(action.marker, ctx)
          : null;

    console.log(`    → ${type}: saving up to ${limit} CV(s) under qa/data/downloads/cvs/`);
    const manifest =
      type === 'downloadStudentCvs'
        ? await downloadStudentOwnCvs(page, baseUrl, { limit })
        : await downloadEmployerApplicationCvs(page, baseUrl, {
            limit,
            marker: marker || null,
            tabs: action.tabs
              ? String(action.tabs)
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
              : undefined,
            studentNameContains: action.studentName
              ? resolveTemplate(action.studentName, ctx)
              : null,
          });

    ctx.lastCvDownloadDir = manifest.outDir;
    ctx.lastCvDownloadCount = manifest.count;
    console.log(`    → ${manifest.count} file(s) → ${manifest.outDir}`);
    return;
  }
}
