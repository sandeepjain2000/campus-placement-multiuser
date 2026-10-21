/**
 * Read the login verification question and enter the sum.
 * The site under test is whatever base URL the caller already chose.
 * A correct sum is accepted on AWS, where the answer is checked, and on Vercel,
 * where a wrong answer is still accepted today.
 * If the question is not on the page, this does nothing.
 */
function loginForm(page) {
  return page.locator('#login-form').first();
}

async function answerLoginCaptcha(page) {
  const captcha = loginForm(page).locator('#login-captcha').first();
  if ((await captcha.count()) === 0) return false;
  const question = page.getByText(/^What is \d+ \+ \d+\?$/).first();
  const shown = await question
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return false;
  const match = ((await question.innerText()) || '').trim().match(/^What is (\d+) \+ (\d+)\?$/);
  if (!match) return false;
  await captcha.fill(String(Number(match[1]) + Number(match[2])));
  await page
    .waitForFunction(() => {
      const btn = document.querySelector('#login-form #login-submit');
      return Boolean(btn && !btn.disabled);
    }, null, { timeout: 15_000 })
    .catch(() => {});
  return true;
}

const { assertNotCoreAccount } = require('./genuineAccounts');

/** Sign in on the site the caller already selected. Does not choose AWS or Vercel. */
async function loginThroughUi(page, baseUrl, email, password) {
  assertNotCoreAccount(email);
  const root = String(baseUrl || '').replace(/\/$/, '');
  await page.goto(`${root}/login?email=${encodeURIComponent(email)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await loginForm(page).locator('#login-email').first().waitFor({ state: 'visible', timeout: 20_000 });
  const emailField = loginForm(page).locator('#login-email').first();
  const passwordField = loginForm(page).locator('#login-password').first();
  for (let i = 0; i < 40; i += 1) {
    const em = await emailField.inputValue().catch(() => '');
    const current = await passwordField.inputValue().catch(() => '');
    if (em === email && current.length > 0) break;
    await page.waitForTimeout(250);
  }
  if ((await emailField.inputValue()) !== email) await emailField.fill(email);
  if (!(await passwordField.inputValue()) && password) await passwordField.fill(password);
  await answerLoginCaptcha(page);
  await loginForm(page).locator('#login-submit').click();
  await page.waitForURL(/\/(dashboard|auth\/continue)/, { timeout: 90_000 });
  if (page.url().includes('/auth/continue')) {
    await page.waitForURL(/\/dashboard\//, { timeout: 90_000 });
  }
}

module.exports = { answerLoginCaptcha, loginThroughUi };
