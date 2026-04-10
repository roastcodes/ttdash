import { defineConfig } from '@playwright/test'

const host = process.env.PLAYWRIGHT_TEST_HOST || '127.0.0.1'
const port = process.env.PLAYWRIGHT_TEST_PORT || '3015'
const baseURL = `http://${host}:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
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
  webServer: {
    command: 'npm run start:test-server',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
