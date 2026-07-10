const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: './qa/tests',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    headless: true,
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
