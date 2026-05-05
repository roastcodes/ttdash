#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { chromium } = require('@playwright/test');
const { waitForRenderedChartData } = require('./rendered-chart-data.js');

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

function createTrustedMutationHeaders(authSession, url) {
  return {
    ...createAuthHeaders(authSession),
    'Content-Type': 'application/json',
    Origin: new URL(url).origin,
  };
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

async function seedSampleUsage({
  url = baseUrl,
  authSession,
  fetchImpl = fetch,
  sampleUsage,
} = {}) {
  let usagePayload = sampleUsage;
  if (usagePayload === undefined) {
    try {
      usagePayload = JSON.parse(fs.readFileSync(sampleUsagePath, 'utf8'));
    } catch (error) {
      throw new Error(
        `Failed to read README screenshot sample usage data from ${sampleUsagePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const response = await fetchImpl(`${url}/api/upload`, {
    method: 'POST',
    headers: createTrustedMutationHeaders(authSession, url),
    body: JSON.stringify(usagePayload),
  });

  if (!response.ok) {
    throw new Error(`Failed to seed README screenshot usage data: ${response.status}`);
  }
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
    await seedSampleUsage({ authSession });

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1400 },
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      globalThis.__TTDASH_TEST_HOOKS__ = {};
    });

    await page.goto(authSession?.bootstrapUrl || baseUrl);
    await switchToEnglish(page);

    await page.evaluate(() => globalThis.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(docsDir, 'ttdash-dashboard.png'),
    });

    await page.locator('#charts').scrollIntoViewIfNeeded();
    await waitForRenderedChartData(page, { sectionSelector: '#charts' });
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
  createTrustedMutationHeaders,
  readAuthStatus,
  seedSampleUsage,
  waitForServer,
};
