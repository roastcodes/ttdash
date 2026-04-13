#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const docsDir = path.join(root, 'docs');
const sampleUsagePath = path.join(root, 'examples', 'sample-usage.json');
const host = process.env.PLAYWRIGHT_TEST_HOST || '127.0.0.1';
const port = process.env.PLAYWRIGHT_TEST_PORT || '3017';
const baseUrl = `http://${host}:${port}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/usage`);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the local server is reachable.
    }

    await sleep(250);
  }

  throw new Error(`Timed out waiting for screenshot server: ${url}`);
}

async function uploadSampleUsage(page) {
  await page.locator('[data-testid="usage-upload-input"]').setInputFiles(sampleUsagePath);
  await page
    .getByText(
      /^(Datei sample-usage\.json erfolgreich geladen|File sample-usage\.json loaded successfully)$/,
    )
    .waitFor();
}

async function switchToEnglish(page) {
  await page.getByTitle(/English|Englisch/).click();
  await page.getByText('Filter status').waitFor();
}

async function captureScreenshots() {
  fs.mkdirSync(docsDir, { recursive: true });

  execSync('npm run build:app', {
    cwd: root,
    stdio: 'inherit',
  });

  const server = spawn(process.execPath, ['scripts/start-test-server.js'], {
    cwd: root,
    env: {
      ...process.env,
      NO_OPEN_BROWSER: '1',
      PLAYWRIGHT_TEST_HOST: host,
      PLAYWRIGHT_TEST_PORT: String(port),
    },
    stdio: 'inherit',
  });

  try {
    await waitForServer(baseUrl);

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1400 },
      colorScheme: 'dark',
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      globalThis.__TTDASH_TEST_HOOKS__ = {};
    });

    await page.goto(baseUrl);
    await uploadSampleUsage(page);
    await switchToEnglish(page);

    await page.evaluate(() => globalThis.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(docsDir, 'ttdash-dashboard.png'),
    });

    await page.locator('#charts').scrollIntoViewIfNeeded();
    await sleep(500);
    await page.locator('#charts').screenshot({
      path: path.join(docsDir, 'ttdash-dashboard-analytics.png'),
    });

    await page.evaluate(() => {
      globalThis.__TTDASH_TEST_HOOKS__?.openSettings?.();
    });
    await page.getByRole('dialog').waitFor();
    await sleep(300);
    await page.getByRole('dialog').screenshot({
      path: path.join(docsDir, 'ttdash-dashboard-settings.png'),
    });

    await context.close();
    await browser.close();
  } finally {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('close', resolve));
  }
}

captureScreenshots().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
