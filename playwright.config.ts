import { defineConfig } from '@playwright/test'

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
    baseURL: 'http://127.0.0.1:3015',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start:test-server',
    url: 'http://127.0.0.1:3015',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
