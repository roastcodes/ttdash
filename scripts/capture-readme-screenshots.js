#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const docsDir = path.join(root, 'docs');
const sampleUsagePath = path.join(root, 'examples', 'sample-usage.json');
const screenshotRuntimeRoot = path.join(root, '.tmp-playwright', 'readme-screenshots');
const authStatusPath = path.join(screenshotRuntimeRoot, 'auth-status.json');
const host = process.env.PLAYWRIGHT_TEST_HOST || '127.0.0.1';
const port = process.env.PLAYWRIGHT_TEST_PORT || '3017';
const baseUrl = `http://${host}:${port}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readAuthStatus(filePath = authStatusPath) {
  try {
    const session = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!session || typeof session !== 'object') {
      return null;
    }

    return {
      authorizationHeader:
        typeof session.authorizationHeader === 'string' ? session.authorizationHeader : '',
      bootstrapUrl: typeof session.bootstrapUrl === 'string' ? session.bootstrapUrl : '',
    };
  } catch {
    return null;
  }
}

function createAuthHeaders(authSession) {
  return authSession?.authorizationHeader
    ? { Authorization: authSession.authorizationHeader }
    : undefined;
}

async function waitForServer(
  url,
  {
    timeoutMs = 30_000,
    pollMs = 250,
    fetchImpl = fetch,
    sleepImpl = sleep,
    readAuthStatusImpl = readAuthStatus,
    authStatusFile = authStatusPath,
  } = {},
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const authSession = readAuthStatusImpl(authStatusFile);
    try {
      const response = await fetchImpl(`${url}/api/usage`, {
        headers: createAuthHeaders(authSession),
      });
      if (response.ok) {
        return authSession;
      }
    } catch {
      // Keep polling until the local server is reachable.
    }

    await sleepImpl(pollMs);
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
  fs.rmSync(screenshotRuntimeRoot, { recursive: true, force: true });
  fs.mkdirSync(screenshotRuntimeRoot, { recursive: true });

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
      TTDASH_AUTH_STATUS_FILE: authStatusPath,
    },
    stdio: 'inherit',
  });

  try {
    const authSession = await waitForServer(baseUrl);

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1400 },
      colorScheme: 'dark',
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      globalThis.__TTDASH_TEST_HOOKS__ = {};
    });

    await page.goto(authSession?.bootstrapUrl || baseUrl);
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

if (require.main === module) {
  captureScreenshots().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  createAuthHeaders,
  readAuthStatus,
  waitForServer,
};
