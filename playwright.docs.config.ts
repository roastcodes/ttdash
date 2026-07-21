import { defineConfig } from '@playwright/test'

const host = process.env.PLAYWRIGHT_DOCS_HOST || '127.0.0.1'
const port = process.env.PLAYWRIGHT_DOCS_PORT || '4322'
const origin = `http://${host}:${port}`
const docsBasePath = '/ttdash/'

export default defineConfig({
  testDir: './tests/docs-e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: 'test-results/docs-playwright-artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-docs-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/playwright-docs.junit.xml' }],
  ],
  use: {
    baseURL: `${origin}${docsBasePath}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npm run docs:preview -- --host ${host} --port ${port}`,
    env: {
      ASTRO_TELEMETRY_DISABLED: '1',
    },
    url: `${origin}${docsBasePath}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
