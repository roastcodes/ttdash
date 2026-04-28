import { defineConfig } from '@playwright/test'

const host = process.env.PLAYWRIGHT_TEST_HOST || '127.0.0.1'
const port = process.env.PLAYWRIGHT_TEST_PORT || '3015'
const baseURL = `http://${host}:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // fullyParallel is safe because tests/e2e/fixtures.ts starts a separate app per
  // worker. process.env.CI caps workers at 2 to avoid hosted-runner CPU
  // contention; pass --workers=1 if CI flakiness needs to be debugged.
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/playwright.junit.xml' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
})
