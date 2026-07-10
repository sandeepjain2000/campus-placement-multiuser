const { defineConfig, devices } = require('@playwright/test');

// PW_HEADED=1 or --headed → visible browser. PW_DEBUG=1 → record video + trace for every test.
const isHeaded = process.env.PW_HEADED === '1' || process.env.PW_HEADED === 'true';
const isDebug = process.env.PW_DEBUG === '1' || process.env.PW_DEBUG === 'true';

module.exports = defineConfig({
  testDir: './qa/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: isDebug ? 0 : 1,
  workers: 1,                     // single worker — avoid DB concurrency issues
  reporter: [['html', { open: isHeaded ? 'on-failure' : 'never' }], ['list']],

  // ── Global timeout settings ───────────────────────────────────────────────
  timeout: 90_000,                // max time per test (90 s)
  expect: {
    timeout: 15_000,              // max time an expect() assertion waits (15 s)
  },

  use: {
    baseURL: 'http://localhost:3000',
    headless: !isHeaded,

    // Give every navigation / action up to 30 s to complete (local Next.js dev is slow)
    navigationTimeout: 30_000,
    actionTimeout:     15_000,

    // Slow down in headed/debug mode so actions are easy to follow on screen
    launchOptions: {
      slowMo: isHeaded || isDebug ? 250 : 150,
    },

    trace: isDebug ? 'on' : 'on-first-retry',
    screenshot: isDebug ? 'on' : 'only-on-failure',
    video: isDebug ? 'on' : 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,    // always reuse if already running
    timeout: 120_000,
  },
});
