#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
const { spawn } = require('child_process');
const spawnCrossPlatform = require('cross-spawn');
const { parseArgs } = require('util');
const { normalizeIncomingData } = require('./usage-normalizer');
const { generatePdfReport } = require('./server/report');
const { version: APP_VERSION } = require('./package.json');
const {
  TOKTRACK_PACKAGE_NAME,
  TOKTRACK_PACKAGE_SPEC,
  TOKTRACK_VERSION,
} = require('./shared/toktrack-version.js');
const { createHttpUtils } = require('./server/http-utils');
const { createDataRuntime } = require('./server/data-runtime');
const { createBackgroundRuntime } = require('./server/background-runtime');
const { createAutoImportRuntime } = require('./server/auto-import-runtime');
const { createHttpRouter } = require('./server/http-router');
const { createServerAuth } = require('./server/remote-auth');
const {
  ensureBindHostAllowed,
  isLoopbackHost,
  listenOnAvailablePort,
} = require('./server/runtime');

const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, 'dist');
const APP_DIR_NAME = 'TTDash';
const APP_DIR_NAME_LINUX = 'ttdash';
const LEGACY_DATA_FILE = path.join(ROOT, 'data.json');
const RAW_CLI_ARGS = process.argv.slice(2);
const NORMALIZED_CLI_ARGS = normalizeCliArgs(RAW_CLI_ARGS);
const CLI_OPTIONS = parseCliArgs(RAW_CLI_ARGS);
const ENV_START_PORT = parseInt(process.env.PORT, 10);
const START_PORT = CLI_OPTIONS.port ?? (Number.isFinite(ENV_START_PORT) ? ENV_START_PORT : 3000);
const MAX_PORT = Math.min(START_PORT + 100, 65535);
const BIND_HOST = process.env.HOST || '127.0.0.1';
const ALLOW_REMOTE_BIND = process.env.TTDASH_ALLOW_REMOTE === '1';
const REMOTE_AUTH_TOKEN = process.env.TTDASH_REMOTE_TOKEN || '';
const API_PREFIX = process.env.API_PREFIX || '/api';
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB
const IS_WINDOWS = process.platform === 'win32';
const SECURE_DIR_MODE = 0o700;
const SECURE_FILE_MODE = 0o600;
const TOKTRACK_LOCAL_BIN =
  process.env.TTDASH_TOKTRACK_LOCAL_BIN ||
  path.join(ROOT, 'node_modules', '.bin', IS_WINDOWS ? 'toktrack.cmd' : 'toktrack');
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy':
    "default-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};
const APP_LABEL = 'TTDash';
const SETTINGS_BACKUP_KIND = 'ttdash-settings-backup';
const USAGE_BACKUP_KIND = 'ttdash-usage-backup';
const IS_BACKGROUND_CHILD = process.env.TTDASH_BACKGROUND_CHILD === '1';
const FORCE_OPEN_BROWSER = process.env.TTDASH_FORCE_OPEN_BROWSER === '1';
const BACKGROUND_START_TIMEOUT_MS = 15000;
const BACKGROUND_INSTANCES_LOCK_TIMEOUT_MS = 5000;
const BACKGROUND_INSTANCES_LOCK_STALE_MS = 10000;
const TOKTRACK_LOCAL_RUNNER_PROBE_TIMEOUT_MS = 7000;
const TOKTRACK_LOCAL_RUNNER_VERSION_CHECK_TIMEOUT_MS = 7000;
const TOKTRACK_LOCAL_RUNNER_IMPORT_TIMEOUT_MS = 60000;
const TOKTRACK_PACKAGE_RUNNER_PROBE_TIMEOUT_MS = 45000;
const TOKTRACK_PACKAGE_RUNNER_VERSION_CHECK_TIMEOUT_MS = 45000;
const TOKTRACK_PACKAGE_RUNNER_IMPORT_TIMEOUT_MS = 60000;
const TOKTRACK_LATEST_LOOKUP_TIMEOUT_MS = 15000;
const TOKTRACK_LATEST_CACHE_SUCCESS_TTL_MS = 5 * 60 * 1000;
const TOKTRACK_LATEST_CACHE_FAILURE_TTL_MS = 60 * 1000;
const PROCESS_TERMINATION_GRACE_MS = 1000;
const FILE_MUTATION_LOCK_TIMEOUT_MS = 10000;
const FILE_MUTATION_LOCK_STALE_MS = 30000;

let startupAutoLoadCompleted = false;
const RUNTIME_INSTANCE = {
  id: process.env.TTDASH_INSTANCE_ID || `${process.pid}-${Date.now()}`,
  pid: process.pid,
  startedAt: new Date().toISOString(),
  mode: IS_BACKGROUND_CHILD ? 'background' : 'foreground',
};
let runtimePort = null;
let runtimeUrl = null;

function normalizeCliArgs(args) {
  return args.map((arg) => {
    if (arg === '-no') {
      return '--no-open';
    }
    if (arg === '-al') {
      return '--auto-load';
    }
    if (arg === '-bg') {
      return '--background';
    }
    return arg;
  });
}

function printHelp() {
  console.log(`TTDash v${APP_VERSION}`);
  console.log('');
  console.log('Usage:');
  console.log('  ttdash [options]');
  console.log('  ttdash stop');
  console.log('');
  console.log('Options:');
  console.log('  -p, --port <port>   Set the start port');
  console.log('  -h, --help          Show this help');
  console.log('  -no, --no-open      Disable browser auto-open');
  console.log('  -al, --auto-load    Run auto-import immediately on startup');
  console.log('  -b, --background    Start TTDash as a background process');
  console.log('');
  console.log('Examples:');
  console.log('  ttdash --port 3010');
  console.log('  ttdash -p 3010 -no');
  console.log('  ttdash --auto-load');
  console.log('  ttdash --background');
  console.log('  ttdash stop');
  console.log('');
  console.log('Environment variables:');
  console.log('  PORT=3010 ttdash');
  console.log('  NO_OPEN_BROWSER=1 ttdash');
  console.log('  HOST=127.0.0.1 ttdash');
  console.log(
    '  TTDASH_ALLOW_REMOTE=1 TTDASH_REMOTE_TOKEN=<long-random-token> HOST=0.0.0.0 ttdash',
  );
}

function parseCliArgs(rawArgs) {
  const args = normalizeCliArgs(rawArgs);

  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        port: {
          type: 'string',
          short: 'p',
        },
        help: {
          type: 'boolean',
          short: 'h',
        },
        'no-open': {
          type: 'boolean',
        },
        'auto-load': {
          type: 'boolean',
        },
        background: {
          type: 'boolean',
          short: 'b',
        },
      },
    });
  } catch (error) {
    console.error(error.message);
    console.log('');
    printHelp();
    process.exit(1);
  }

  if (parsed.values.help) {
    printHelp();
    process.exit(0);
  }

  let command = null;
  if (parsed.positionals.length > 1) {
    console.error(`Unknown invocation: ${parsed.positionals.join(' ')}`);
    console.log('');
    printHelp();
    process.exit(1);
  }

  if (parsed.positionals.length === 1) {
    if (parsed.positionals[0] !== 'stop') {
      console.error(`Unknown command: ${parsed.positionals[0]}`);
      console.log('');
      printHelp();
      process.exit(1);
    }

    command = 'stop';
  }

  let port;
  if (parsed.values.port !== undefined) {
    const parsedPort = Number.parseInt(parsed.values.port, 10);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      console.error(`Invalid port: ${parsed.values.port}`);
      console.log('');
      printHelp();
      process.exit(1);
    }
    port = parsedPort;
  }

  return {
    command,
    port,
    noOpen: Boolean(parsed.values['no-open']),
    autoLoad: Boolean(parsed.values['auto-load']),
    background: Boolean(parsed.values.background),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('de-CH', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

const dataRuntime = createDataRuntime({
  fs,
  fsPromises: require('fs/promises'),
  os: require('os'),
  path,
  processObject: process,
  normalizeIncomingData,
  runtimeInstanceId: RUNTIME_INSTANCE.id,
  appDirName: APP_DIR_NAME,
  appDirNameLinux: APP_DIR_NAME_LINUX,
  legacyDataFile: LEGACY_DATA_FILE,
  settingsBackupKind: SETTINGS_BACKUP_KIND,
  usageBackupKind: USAGE_BACKUP_KIND,
  isWindows: IS_WINDOWS,
  secureDirMode: SECURE_DIR_MODE,
  secureFileMode: SECURE_FILE_MODE,
  fileMutationLockTimeoutMs: FILE_MUTATION_LOCK_TIMEOUT_MS,
  fileMutationLockStaleMs: FILE_MUTATION_LOCK_STALE_MS,
  getCliAutoLoadActive: () => startupAutoLoadCompleted,
});
const LOCAL_AUTH_SESSION_FILE = path.join(dataRuntime.appPaths.configDir, 'session-auth.json');
const serverAuth = createServerAuth({
  bindHost: BIND_HOST,
  allowRemoteBind: ALLOW_REMOTE_BIND,
  remoteToken: REMOTE_AUTH_TOKEN,
});

const backgroundRuntime = createBackgroundRuntime({
  fs,
  path,
  processObject: process,
  fetchImpl: fetch,
  spawnImpl: spawn,
  readlinePromises: readline,
  entrypointPath: __filename,
  appPaths: dataRuntime.appPaths,
  ensureAppDirs: dataRuntime.ensureAppDirs,
  ensureDir: dataRuntime.ensureDir,
  writeJsonAtomic: dataRuntime.writeJsonAtomic,
  normalizeIsoTimestamp: dataRuntime.normalizeIsoTimestamp,
  bindHost: BIND_HOST,
  apiPrefix: API_PREFIX,
  authHeader: serverAuth.getAuthorizationHeader(),
  runtimeInstance: RUNTIME_INSTANCE,
  normalizedCliArgs: NORMALIZED_CLI_ARGS,
  cliOptions: CLI_OPTIONS,
  forceOpenBrowser: FORCE_OPEN_BROWSER,
  isWindows: IS_WINDOWS,
  secureDirMode: SECURE_DIR_MODE,
  secureFileMode: SECURE_FILE_MODE,
  backgroundStartTimeoutMs: BACKGROUND_START_TIMEOUT_MS,
  backgroundInstancesLockTimeoutMs: BACKGROUND_INSTANCES_LOCK_TIMEOUT_MS,
  backgroundInstancesLockStaleMs: BACKGROUND_INSTANCES_LOCK_STALE_MS,
  sleep,
  isProcessRunning,
  formatDateTime,
});

const autoImportRuntime = createAutoImportRuntime({
  fs,
  processObject: process,
  spawnCrossPlatform,
  normalizeIncomingData,
  withSettingsAndDataMutationLock: dataRuntime.withSettingsAndDataMutationLock,
  writeData: dataRuntime.writeData,
  updateDataLoadState: dataRuntime.updateDataLoadState,
  toktrackPackageName: TOKTRACK_PACKAGE_NAME,
  toktrackPackageSpec: TOKTRACK_PACKAGE_SPEC,
  toktrackVersion: TOKTRACK_VERSION,
  toktrackLocalBin: TOKTRACK_LOCAL_BIN,
  npxCacheDir: dataRuntime.paths.npxCacheDir,
  isWindows: IS_WINDOWS,
  processTerminationGraceMs: PROCESS_TERMINATION_GRACE_MS,
  toktrackLocalRunnerProbeTimeoutMs: TOKTRACK_LOCAL_RUNNER_PROBE_TIMEOUT_MS,
  toktrackLocalRunnerVersionCheckTimeoutMs: TOKTRACK_LOCAL_RUNNER_VERSION_CHECK_TIMEOUT_MS,
  toktrackLocalRunnerImportTimeoutMs: TOKTRACK_LOCAL_RUNNER_IMPORT_TIMEOUT_MS,
  toktrackPackageRunnerProbeTimeoutMs: TOKTRACK_PACKAGE_RUNNER_PROBE_TIMEOUT_MS,
  toktrackPackageRunnerVersionCheckTimeoutMs: TOKTRACK_PACKAGE_RUNNER_VERSION_CHECK_TIMEOUT_MS,
  toktrackPackageRunnerImportTimeoutMs: TOKTRACK_PACKAGE_RUNNER_IMPORT_TIMEOUT_MS,
  toktrackLatestLookupTimeoutMs: TOKTRACK_LATEST_LOOKUP_TIMEOUT_MS,
  toktrackLatestCacheSuccessTtlMs: TOKTRACK_LATEST_CACHE_SUCCESS_TTL_MS,
  toktrackLatestCacheFailureTtlMs: TOKTRACK_LATEST_CACHE_FAILURE_TTL_MS,
});

const httpUtils = createHttpUtils({
  apiPrefix: API_PREFIX,
  maxBodySize: MAX_BODY_SIZE,
  securityHeaders: SECURITY_HEADERS,
  bindHost: BIND_HOST,
});

const router = createHttpRouter({
  fs,
  path,
  staticRoot: STATIC_ROOT,
  securityHeaders: SECURITY_HEADERS,
  httpUtils,
  remoteAuth: serverAuth,
  dataRuntime,
  autoImportRuntime,
  generatePdfReport,
  getRuntimeSnapshot: () => ({
    id: RUNTIME_INSTANCE.id,
    mode: RUNTIME_INSTANCE.mode,
    port: runtimePort,
    url: runtimeUrl,
  }),
});

function shouldOpenBrowser() {
  if (CLI_OPTIONS.noOpen || process.env.NO_OPEN_BROWSER === '1' || process.env.CI === '1') {
    return false;
  }

  if (FORCE_OPEN_BROWSER) {
    return true;
  }

  return Boolean(process.stdout.isTTY);
}

function openBrowser(url) {
  if (!shouldOpenBrowser()) {
    return;
  }

  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {});
  child.unref();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value || 0);
}

function formatInteger(value) {
  return new Intl.NumberFormat('de-CH').format(value || 0);
}

function describeDataFile() {
  if (!fs.existsSync(dataRuntime.paths.dataFile)) {
    return 'no local file found';
  }

  try {
    const normalized = dataRuntime.readData();
    if (!normalized) {
      return 'present, but unreadable';
    }

    const totalCost = formatCurrency(normalized.totals?.totalCost || 0);
    const totalTokens = formatInteger(normalized.totals?.totalTokens || 0);
    const dailyCount = formatInteger(normalized.daily?.length || 0);
    return `${dailyCount} days, ${totalCost}, ${totalTokens} tokens`;
  } catch {
    return 'present, but unreadable';
  }
}

function printStartupSummary(url, port) {
  const browserMode = shouldOpenBrowser() ? 'enabled' : 'disabled';
  const autoLoadMode = CLI_OPTIONS.autoLoad ? 'enabled' : 'disabled';
  const runtimeMode = IS_BACKGROUND_CHILD ? 'background' : 'foreground';
  const remoteBind = !isLoopbackHost(BIND_HOST);
  const bootstrapUrl = serverAuth.createBootstrapUrl(url);

  console.log('');
  console.log(`${APP_LABEL} v${APP_VERSION} is ready`);
  console.log(`  URL:            ${url}`);
  console.log(`  API:            ${url}/api/usage`);
  console.log(`  Port:           ${port}`);
  console.log(`  Host:           ${BIND_HOST}`);
  if (remoteBind) {
    console.log(`  Exposure:       network-accessible via ${BIND_HOST}`);
    console.log('  Remote Auth:    required');
  } else {
    console.log('  Local Auth:     required');
  }
  console.log(`  Mode:           ${runtimeMode}`);
  console.log(`  Static Root:    ${STATIC_ROOT}`);
  console.log(`  Data File:      ${dataRuntime.paths.dataFile}`);
  console.log(`  Settings File:  ${dataRuntime.paths.settingsFile}`);
  if (IS_BACKGROUND_CHILD && process.env.TTDASH_BACKGROUND_LOG_FILE) {
    console.log(`  Log File:       ${process.env.TTDASH_BACKGROUND_LOG_FILE}`);
  }
  console.log(`  Data Status:    ${describeDataFile()}`);
  console.log(`  Browser Open:   ${browserMode}`);
  console.log(`  Auto-Load:      ${autoLoadMode}`);
  if (!remoteBind && !shouldOpenBrowser()) {
    console.log(`  Local Auth URL: ${bootstrapUrl}`);
  }
  if (remoteBind) {
    console.log('');
    console.log('Security warning: this bind host exposes the dashboard to the network.');
    console.log(
      'Use non-loopback hosts only on trusted networks and keep TTDASH_REMOTE_TOKEN secret.',
    );
    console.log('Open remote browsers once with ?ttdash_token=<TTDASH_REMOTE_TOKEN>.');
  }
  console.log('');
  console.log('Available ways to load data:');
  console.log('  1. Start auto-import from the app');
  console.log('  2. Import toktrack JSON via upload');
  console.log('');
  console.log('Useful commands:');
  console.log(`  ttdash --port ${port}`);
  console.log(`  ttdash --port ${port} --no-open`);
  console.log('  ttdash --background');
  console.log('  ttdash stop');
  console.log(`  NO_OPEN_BROWSER=1 PORT=${port} node server.js`);
  console.log(
    `  TTDASH_ALLOW_REMOTE=1 TTDASH_REMOTE_TOKEN=<long-random-token> HOST=${BIND_HOST} PORT=${port} node server.js`,
  );
  if (remoteBind) {
    console.log(`  curl -H "Authorization: Bearer $TTDASH_REMOTE_TOKEN" ${url}/api/usage`);
  } else {
    console.log(
      `  curl -H "Authorization: Bearer <session-token-from-local-auth-url>" ${url}/api/usage`,
    );
  }
  console.log('');
}

function writeLocalAuthSessionFile(url) {
  if (!serverAuth.isLocalRequired()) {
    return;
  }

  const authorizationHeader = serverAuth.getAuthorizationHeader();
  if (!authorizationHeader) {
    return;
  }

  dataRuntime.writeJsonAtomic(LOCAL_AUTH_SESSION_FILE, {
    version: 1,
    mode: serverAuth.mode,
    instanceId: RUNTIME_INSTANCE.id,
    pid: process.pid,
    url,
    apiPrefix: API_PREFIX,
    authorizationHeader,
    bootstrapUrl: serverAuth.createBootstrapUrl(url),
    createdAt: new Date().toISOString(),
  });
}

async function runStartupAutoLoad({ source = 'cli-auto-load' } = {}) {
  console.log('Auto-load enabled, starting import...');

  try {
    const result = await autoImportRuntime.performAutoImport({
      source,
      onCheck: (event) => {
        if (event.status === 'found') {
          console.log(`toktrack found (${event.method}, v${event.version})`);
        }
      },
      onProgress: (event) => {
        console.log(autoImportRuntime.formatAutoImportMessageEvent(event));
      },
      onOutput: (line) => {
        console.log(line);
      },
    });

    startupAutoLoadCompleted = true;
    console.log(
      `Auto-load complete: imported ${result.days} days, ${formatCurrency(result.totalCost)}.`,
    );
  } catch (error) {
    console.error(`Auto-load failed: ${error.message}`);
    console.error('Dashboard will start without newly imported data.');
  }
}

const server = http.createServer((req, res) => {
  void router.handleServerRequest(req, res).catch((error) => {
    console.error(error);
    if (res.headersSent) {
      res.end();
      return;
    }
    httpUtils.json(res, 500, { message: 'Internal Server Error' });
  });
});

server.on('clientError', (error, socket) => {
  console.error(error);
  if (!socket.writable) {
    return;
  }
  socket.end(
    'HTTP/1.1 400 Bad Request\r\n' +
      'Content-Type: application/json; charset=utf-8\r\n' +
      'Connection: close\r\n' +
      '\r\n' +
      JSON.stringify({ message: 'Invalid request path' }),
  );
});

function tryListen(port) {
  return listenOnAvailablePort(server, port, MAX_PORT, BIND_HOST, console.log, START_PORT);
}

function ensureServerSecurityAllowed() {
  ensureBindHostAllowed(BIND_HOST, ALLOW_REMOTE_BIND);
  serverAuth.ensureConfigured();
}

async function start() {
  ensureServerSecurityAllowed();
  dataRuntime.ensureAppDirs([backgroundRuntime.paths.backgroundLogDir]);
  dataRuntime.migrateLegacyDataFile();

  const port = await tryListen(START_PORT);
  const browserHost = BIND_HOST === '0.0.0.0' ? 'localhost' : BIND_HOST;
  const url = `http://${browserHost}:${port}`;
  runtimePort = port;
  runtimeUrl = url;
  writeLocalAuthSessionFile(url);

  if (IS_BACKGROUND_CHILD) {
    await backgroundRuntime.registerBackgroundInstance(
      backgroundRuntime.createBackgroundInstance({
        port,
        url,
        bootstrapUrl: serverAuth.createBootstrapUrl(url),
      }),
    );
  }

  if (CLI_OPTIONS.autoLoad) {
    await runStartupAutoLoad({
      source: 'cli-auto-load',
    });
  }

  printStartupSummary(url, port);
  openBrowser(serverAuth.createBootstrapUrl(url));
}

async function runCli() {
  if (CLI_OPTIONS.command === 'stop') {
    await backgroundRuntime.runStopCommand();
    return;
  }

  if (CLI_OPTIONS.background && !IS_BACKGROUND_CHILD) {
    ensureServerSecurityAllowed();
    await backgroundRuntime.startInBackground();
    return;
  }

  await start();
}

function registerShutdownHandlers() {
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
}

function bootstrapCli() {
  runCli().catch((error) => {
    Promise.resolve()
      .then(async () => {
        if (IS_BACKGROUND_CHILD) {
          await backgroundRuntime.unregisterBackgroundInstance(process.pid);
        }
      })
      .finally(() => {
        console.error(error);
        process.exit(1);
      });
  });

  registerShutdownHandlers();
}

module.exports = {
  bootstrapCli,
  runCli,
  __test__: {
    commandExists: autoImportRuntime.commandExists,
    getExecutableName: autoImportRuntime.getExecutableName,
    getLocalToktrackDisplayCommand: autoImportRuntime.getLocalToktrackDisplayCommand,
    parseToktrackVersionOutput: autoImportRuntime.parseToktrackVersionOutput,
    resolveToktrackRunner: autoImportRuntime.resolveToktrackRunner,
    toAutoImportRunnerResolutionError: autoImportRuntime.toAutoImportRunnerResolutionError,
    runToktrack: autoImportRuntime.runToktrack,
    runCommandWithSpawn: autoImportRuntime.runCommandWithSpawn,
    lookupLatestToktrackVersion: autoImportRuntime.lookupLatestToktrackVersion,
    getToktrackRunnerTimeouts: autoImportRuntime.getToktrackRunnerTimeouts,
    getToktrackLatestLookupTimeoutMs: autoImportRuntime.getToktrackLatestLookupTimeoutMs,
    resetLatestToktrackVersionCache: autoImportRuntime.resetLatestToktrackVersionCache,
    listenOnAvailablePort,
    getFileMutationLockDir: dataRuntime.getFileMutationLockDir,
    unlinkIfExists: dataRuntime.unlinkIfExists,
    writeJsonAtomicAsync: dataRuntime.writeJsonAtomicAsync,
    withFileMutationLock: dataRuntime.withFileMutationLock,
    withOrderedFileMutationLocks: dataRuntime.withOrderedFileMutationLocks,
    getPendingFileMutationLockCount: dataRuntime.getPendingFileMutationLockCount,
  },
};

if (require.main === module) {
  bootstrapCli();
}

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down server...`);
  server.close(async () => {
    if (IS_BACKGROUND_CHILD) {
      await backgroundRuntime.unregisterBackgroundInstance(process.pid);
    }
    console.log('Server stopped.');
    process.exit(0);
  });

  setTimeout(async () => {
    if (IS_BACKGROUND_CHILD) {
      await backgroundRuntime.unregisterBackgroundInstance(process.pid);
    }
    console.log('Forcing shutdown.');
    process.exit(0);
  }, 3000);
}
