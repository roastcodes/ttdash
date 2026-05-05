#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { chromium } = require('@playwright/test');
const { createDefaultPersistedAppSettings } = require('../shared/app-settings.js');
const { normalizeIncomingData } = require('../usage-normalizer.js');
const { waitForRenderedChartData } = require('./rendered-chart-data.js');

const root = path.resolve(__dirname, '..');
const docsDir = path.join(root, 'docs');
const sampleUsagePath = path.join(root, 'examples', 'sample-usage.json');
const screenshotRuntimeRoot = path.join(root, '.tmp-playwright', 'readme-screenshots');
const screenshotServerRuntimeRoot = path.join(screenshotRuntimeRoot, 'app');
const screenshotLocalAuthToken = 'ttdash-readme-screenshots-local-auth-token';
const screenshotSeedLoadedAt = '2026-04-01T12:30:00.000Z';
const host = process.env.PLAYWRIGHT_TEST_HOST || '127.0.0.1';
const port = process.env.PLAYWRIGHT_TEST_PORT || '3017';
const baseUrl = `http://${host}:${port}`;
const secureDirMode = 0o700;
const secureFileMode = 0o600;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createScreenshotAuthSession(url = baseUrl, token = screenshotLocalAuthToken) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new Error('README screenshot local auth token is required.');
  }

  const bootstrapUrl = new URL(url);
  bootstrapUrl.searchParams.set('ttdash_token', normalizedToken);

  return {
    authorizationHeader: `Bearer ${normalizedToken}`,
    bootstrapUrl: bootstrapUrl.href,
  };
}

function createAuthHeaders(authSession) {
  return authSession?.authorizationHeader
    ? { Authorization: authSession.authorizationHeader }
    : undefined;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: secureDirMode });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), {
      mode: secureFileMode,
    });
    if (process.platform !== 'win32') {
      fs.chmodSync(tempPath, secureFileMode);
    }
    fs.renameSync(tempPath, filePath);
    if (process.platform !== 'win32') {
      fs.chmodSync(filePath, secureFileMode);
    }
  } catch (error) {
    try {
      fs.unlinkSync(tempPath);
    } catch (cleanupError) {
      if (cleanupError?.code !== 'ENOENT') {
        throw new AggregateError(
          [error, cleanupError],
          `Failed atomic JSON write and temp-file cleanup for ${path.basename(filePath)}.`,
        );
      }
    }
    throw error;
  }
}

function readSampleUsage(filePath = sampleUsagePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Failed to read README screenshot sample usage data from ${filePath}: ${getErrorMessage(
        error,
      )}`,
    );
  }
}

function normalizeSampleUsage(usagePayload) {
  try {
    return normalizeIncomingData(usagePayload);
  } catch (error) {
    throw new Error(
      `Failed to normalize README screenshot sample usage data: ${getErrorMessage(error)}`,
    );
  }
}

function seedSampleUsageFile({
  runtimeRoot = screenshotServerRuntimeRoot,
  loadedAt = screenshotSeedLoadedAt,
  sampleUsage,
  sampleUsageFile = sampleUsagePath,
} = {}) {
  const usageData = normalizeSampleUsage(
    sampleUsage === undefined ? readSampleUsage(sampleUsageFile) : sampleUsage,
  );
  const settings = {
    ...createDefaultPersistedAppSettings(),
    lastLoadedAt: loadedAt,
    lastLoadSource: 'file',
  };
  const dataFile = path.join(runtimeRoot, 'data', 'data.json');
  const settingsFile = path.join(runtimeRoot, 'config', 'settings.json');

  writeJsonAtomic(dataFile, usageData);
  writeJsonAtomic(settingsFile, settings);

  return {
    dataFile,
    settings,
    settingsFile,
    usageData,
  };
}

async function waitForServer(
  url,
  {
    timeoutMs = 30_000,
    pollMs = 250,
    fetchImpl = fetch,
    sleepImpl = sleep,
    authSession = createScreenshotAuthSession(url),
  } = {},
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
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
      PLAYWRIGHT_TEST_RUNTIME_ROOT: screenshotServerRuntimeRoot,
      TTDASH_LOCAL_AUTH_TOKEN: screenshotLocalAuthToken,
    },
    stdio: 'inherit',
  });

  try {
    const authSession = createScreenshotAuthSession(baseUrl);
    await waitForServer(baseUrl, { authSession });
    seedSampleUsageFile();

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
  createScreenshotAuthSession,
  seedSampleUsageFile,
  screenshotLocalAuthToken,
  screenshotSeedLoadedAt,
  waitForServer,
};
