#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');
const readline = require('readline/promises');
const { spawn } = require('child_process');
const spawnCrossPlatform = require('cross-spawn');
const { parseArgs } = require('util');
const { normalizeIncomingData } = require('./usage-normalizer');
const { generatePdfReport } = require('./server/report');
const { version: APP_VERSION } = require('./package.json');
const dashboardPreferences = require('./shared/dashboard-preferences.json');
const { createHttpUtils } = require('./server/http-utils');
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
const API_PREFIX = process.env.API_PREFIX || '/api';
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB
const IS_WINDOWS = process.platform === 'win32';
const SECURE_DIR_MODE = 0o700;
const SECURE_FILE_MODE = 0o600;
const TOKTRACK_LOCAL_BIN = path.join(
  ROOT,
  'node_modules',
  '.bin',
  IS_WINDOWS ? 'toktrack.cmd' : 'toktrack',
);
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
const DASHBOARD_DATE_PRESETS = dashboardPreferences.datePresets;
const DASHBOARD_SECTION_IDS = dashboardPreferences.sectionDefinitions.map((section) => section.id);
const DEFAULT_SETTINGS = {
  language: 'de',
  theme: 'dark',
  providerLimits: {},
  defaultFilters: {
    viewMode: 'daily',
    datePreset: 'all',
    providers: [],
    models: [],
  },
  sectionVisibility: Object.fromEntries(
    DASHBOARD_SECTION_IDS.map((sectionId) => [sectionId, true]),
  ),
  sectionOrder: DASHBOARD_SECTION_IDS,
  lastLoadedAt: null,
  lastLoadSource: null,
};
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
  console.log('  TTDASH_ALLOW_REMOTE=1 HOST=0.0.0.0 ttdash');
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

function resolveAppPaths() {
  const homeDir = os.homedir();
  const explicitPaths = {
    dataDir: process.env.TTDASH_DATA_DIR,
    configDir: process.env.TTDASH_CONFIG_DIR,
    cacheDir: process.env.TTDASH_CACHE_DIR,
  };
  let platformPaths;

  if (process.platform === 'darwin') {
    const appSupportDir = path.join(homeDir, 'Library', 'Application Support', APP_DIR_NAME);
    platformPaths = {
      dataDir: appSupportDir,
      configDir: appSupportDir,
      cacheDir: path.join(homeDir, 'Library', 'Caches', APP_DIR_NAME),
    };
  } else if (IS_WINDOWS) {
    platformPaths = {
      dataDir: path.join(
        process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'),
        APP_DIR_NAME,
      ),
      configDir: path.join(
        process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'),
        APP_DIR_NAME,
      ),
      cacheDir: path.join(
        process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'),
        APP_DIR_NAME,
        'Cache',
      ),
    };
  } else {
    const appName = APP_DIR_NAME_LINUX;
    platformPaths = {
      dataDir: path.join(
        process.env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share'),
        appName,
      ),
      configDir: path.join(process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), appName),
      cacheDir: path.join(process.env.XDG_CACHE_HOME || path.join(homeDir, '.cache'), appName),
    };
  }

  return {
    dataDir: explicitPaths.dataDir || platformPaths.dataDir,
    configDir: explicitPaths.configDir || platformPaths.configDir,
    cacheDir: explicitPaths.cacheDir || platformPaths.cacheDir,
  };
}

const APP_PATHS = resolveAppPaths();
const DATA_FILE = path.join(APP_PATHS.dataDir, 'data.json');
const SETTINGS_FILE = path.join(APP_PATHS.configDir, 'settings.json');
const NPX_CACHE_DIR = path.join(APP_PATHS.cacheDir, 'npx-cache');
const BACKGROUND_INSTANCES_FILE = path.join(APP_PATHS.configDir, 'background-instances.json');
const BACKGROUND_LOG_DIR = path.join(APP_PATHS.cacheDir, 'background');
const BACKGROUND_INSTANCES_LOCK_DIR = path.join(APP_PATHS.configDir, 'background-instances.lock');
const BACKGROUND_INSTANCES_LOCK_TIMEOUT_MS = 5000;
const BACKGROUND_INSTANCES_LOCK_STALE_MS = 10000;
const FILE_MUTATION_LOCK_TIMEOUT_MS = 10000;
const FILE_MUTATION_LOCK_STALE_MS = 30000;
const fileMutationLocks = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true, mode: SECURE_DIR_MODE });
  if (!IS_WINDOWS) {
    fs.chmodSync(dirPath, SECURE_DIR_MODE);
  }
}

function ensureAppDirs() {
  ensureDir(APP_PATHS.dataDir);
  ensureDir(APP_PATHS.configDir);
  ensureDir(APP_PATHS.cacheDir);
  ensureDir(NPX_CACHE_DIR);
  ensureDir(BACKGROUND_LOG_DIR);
}

function writeJsonAtomic(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), {
    mode: SECURE_FILE_MODE,
  });
  if (!IS_WINDOWS) {
    fs.chmodSync(tempPath, SECURE_FILE_MODE);
  }
  fs.renameSync(tempPath, filePath);
}

async function writeJsonAtomicAsync(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  let tempPathCreated = false;

  try {
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true, mode: SECURE_DIR_MODE });
    tempPathCreated = true;
    await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2), {
      mode: SECURE_FILE_MODE,
    });

    if (!IS_WINDOWS) {
      await fsPromises.chmod(tempPath, SECURE_FILE_MODE);
    }

    await fsPromises.rename(tempPath, filePath);
  } catch (error) {
    if (tempPathCreated) {
      try {
        await fsPromises.unlink(tempPath);
      } catch (unlinkError) {
        if (unlinkError?.code !== 'ENOENT') {
          // Ignore temp-file cleanup failures so the original error wins.
        }
      }
    }
    throw error;
  }
}

async function unlinkIfExists(filePath) {
  try {
    await fsPromises.unlink(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

function getFileMutationLockDir(filePath) {
  return `${filePath}.lock`;
}

function getFileMutationLockOwnerPath(lockDir) {
  return path.join(lockDir, 'owner.json');
}

async function removeFileMutationLockDir(lockDir) {
  try {
    await fsPromises.rm(lockDir, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function writeFileMutationLockOwner(lockDir) {
  const ownerPath = getFileMutationLockOwnerPath(lockDir);
  const owner = {
    pid: process.pid,
    createdAt: new Date().toISOString(),
    instanceId: RUNTIME_INSTANCE.id,
  };
  await fsPromises.writeFile(ownerPath, JSON.stringify(owner, null, 2), {
    mode: SECURE_FILE_MODE,
  });
  if (!IS_WINDOWS) {
    await fsPromises.chmod(ownerPath, SECURE_FILE_MODE);
  }
}

async function shouldReapFileMutationLock(lockDir) {
  const ownerPath = getFileMutationLockOwnerPath(lockDir);

  try {
    const rawOwner = await fsPromises.readFile(ownerPath, 'utf-8');
    const owner = JSON.parse(rawOwner);

    if (Number.isInteger(owner?.pid)) {
      return !isProcessRunning(owner.pid);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      // Fall back to age-based cleanup if the owner metadata is missing or malformed.
    }
  }

  try {
    const stats = await fsPromises.stat(lockDir);
    return Date.now() - stats.mtimeMs > FILE_MUTATION_LOCK_STALE_MS;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function withCrossProcessFileMutationLock(
  filePath,
  operation,
  timeoutMs = FILE_MUTATION_LOCK_TIMEOUT_MS,
) {
  const lockDir = getFileMutationLockDir(filePath);
  const startedAt = Date.now();

  while (true) {
    try {
      await fsPromises.mkdir(path.dirname(lockDir), {
        recursive: true,
        mode: SECURE_DIR_MODE,
      });
      await fsPromises.mkdir(lockDir, { mode: SECURE_DIR_MODE });
      if (!IS_WINDOWS) {
        await fsPromises.chmod(lockDir, SECURE_DIR_MODE);
      }

      try {
        await writeFileMutationLockOwner(lockDir);
      } catch (error) {
        await removeFileMutationLockDir(lockDir).catch(() => undefined);
        throw error;
      }

      break;
    } catch (error) {
      if (!error || error.code !== 'EEXIST') {
        throw error;
      }

      if (await shouldReapFileMutationLock(lockDir)) {
        await removeFileMutationLockDir(lockDir).catch(() => undefined);
        continue;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error(`Could not acquire file mutation lock for ${path.basename(filePath)}.`, {
          cause: error,
        });
      }

      await sleep(50);
    }
  }

  try {
    return await operation();
  } finally {
    try {
      await removeFileMutationLockDir(lockDir);
    } catch {
      // Ignore cleanup races so the original operation result wins.
    }
  }
}

async function withFileMutationLock(filePath, operation) {
  const previous = fileMutationLocks.get(filePath) || Promise.resolve();
  let releaseCurrent;
  const current = new Promise((resolve) => {
    releaseCurrent = resolve;
  });

  fileMutationLocks.set(filePath, current);

  await previous.catch(() => undefined);

  try {
    return await withCrossProcessFileMutationLock(filePath, operation);
  } finally {
    releaseCurrent();
    if (fileMutationLocks.get(filePath) === current) {
      fileMutationLocks.delete(filePath);
    }
  }
}

async function withOrderedFileMutationLocks(filePaths, operation) {
  const uniquePaths = Array.from(new Set(filePaths)).sort();

  const runWithLock = async (index) => {
    if (index >= uniquePaths.length) {
      return operation();
    }

    const filePath = uniquePaths[index];
    return withFileMutationLock(filePath, () => runWithLock(index + 1));
  };

  return runWithLock(0);
}

async function withSettingsAndDataMutationLock(operation) {
  return withOrderedFileMutationLocks([SETTINGS_FILE, DATA_FILE], operation);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('de-CH', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
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

async function fetchRuntimeIdentity(url, timeoutMs = 1000) {
  if (typeof url !== 'string' || !url.trim()) {
    return null;
  }

  const runtimePath = `${API_PREFIX.replace(/\/+$/, '')}/runtime`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL(runtimePath, `${url}/`), {
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return payload;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function isBackgroundInstanceOwned(instance) {
  if (!instance || typeof instance !== 'object') {
    return false;
  }

  if (!isProcessRunning(instance.pid)) {
    return false;
  }

  const runtime = await fetchRuntimeIdentity(instance.url);
  if (!runtime || typeof runtime.id !== 'string') {
    return false;
  }

  return (
    runtime.id === instance.id && runtime.pid === instance.pid && runtime.port === instance.port
  );
}

function normalizeBackgroundInstance(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const pid = Number.parseInt(value.pid, 10);
  const port = Number.parseInt(value.port, 10);
  const startedAt = normalizeIsoTimestamp(value.startedAt);
  const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : null;
  const url = typeof value.url === 'string' && value.url.trim() ? value.url.trim() : null;
  const host = typeof value.host === 'string' && value.host.trim() ? value.host.trim() : BIND_HOST;

  if (
    !id ||
    !url ||
    !startedAt ||
    !Number.isInteger(pid) ||
    pid <= 0 ||
    !Number.isInteger(port) ||
    port <= 0
  ) {
    return null;
  }

  return {
    id,
    pid,
    port,
    url,
    host,
    startedAt,
    logFile:
      typeof value.logFile === 'string' && value.logFile.trim() ? value.logFile.trim() : null,
  };
}

function readBackgroundInstancesRaw() {
  try {
    const parsed = JSON.parse(fs.readFileSync(BACKGROUND_INSTANCES_FILE, 'utf-8'));
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore missing or invalid background registry state.
  }

  return [];
}

function writeBackgroundInstances(instances) {
  writeJsonAtomic(BACKGROUND_INSTANCES_FILE, instances);
}

async function readBackgroundInstancesSnapshot() {
  const normalized = readBackgroundInstancesRaw().map(normalizeBackgroundInstance).filter(Boolean);
  const alive = [];

  for (const instance of normalized) {
    if (await isBackgroundInstanceOwned(instance)) {
      alive.push(instance);
    }
  }

  const changed = readBackgroundInstancesRaw().length !== alive.length;

  alive.sort((left, right) => {
    const byStartedAt = left.startedAt.localeCompare(right.startedAt);
    if (byStartedAt !== 0) {
      return byStartedAt;
    }
    return left.port - right.port;
  });

  return {
    normalized,
    alive,
    changed,
  };
}

async function getBackgroundInstances() {
  return (await readBackgroundInstancesSnapshot()).alive;
}

async function withBackgroundInstancesLock(
  callback,
  timeoutMs = BACKGROUND_INSTANCES_LOCK_TIMEOUT_MS,
) {
  const startedAt = Date.now();

  while (true) {
    try {
      fs.mkdirSync(BACKGROUND_INSTANCES_LOCK_DIR, { mode: SECURE_DIR_MODE });
      break;
    } catch (error) {
      if (!error || error.code !== 'EEXIST') {
        throw error;
      }

      let lockIsStale = false;
      try {
        const stats = fs.statSync(BACKGROUND_INSTANCES_LOCK_DIR);
        lockIsStale = Date.now() - stats.mtimeMs > BACKGROUND_INSTANCES_LOCK_STALE_MS;
      } catch {
        // Ignore stat races while the lock directory is changing.
      }

      if (lockIsStale) {
        try {
          fs.rmSync(BACKGROUND_INSTANCES_LOCK_DIR, { recursive: true, force: true });
          continue;
        } catch {
          // Ignore lock cleanup races and retry until timeout.
        }
      }

      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error('Could not acquire background registry lock.', { cause: error });
      }

      await sleep(50);
    }
  }

  try {
    return await callback();
  } finally {
    try {
      fs.rmSync(BACKGROUND_INSTANCES_LOCK_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup races after the lock holder exits.
    }
  }
}

async function pruneBackgroundInstances() {
  return withBackgroundInstancesLock(async () => {
    const snapshot = await readBackgroundInstancesSnapshot();
    if (snapshot.changed) {
      writeBackgroundInstances(snapshot.alive);
    }

    return snapshot.alive;
  });
}

async function registerBackgroundInstance(instance) {
  return withBackgroundInstancesLock(async () => {
    const instances = (await readBackgroundInstancesSnapshot()).alive;
    const nextInstances = instances.filter((entry) => entry.pid !== instance.pid);
    nextInstances.push(instance);
    nextInstances.sort((left, right) => {
      const byStartedAt = left.startedAt.localeCompare(right.startedAt);
      if (byStartedAt !== 0) {
        return byStartedAt;
      }
      return left.port - right.port;
    });
    writeBackgroundInstances(nextInstances);
  });
}

async function unregisterBackgroundInstance(pid) {
  return withBackgroundInstancesLock(async () => {
    const instances = (await readBackgroundInstancesSnapshot()).alive;
    const nextInstances = instances.filter((entry) => entry.pid !== pid);
    if (nextInstances.length !== instances.length) {
      writeBackgroundInstances(nextInstances);
    }
  });
}

function createBackgroundInstance({ port, url }) {
  return {
    id: RUNTIME_INSTANCE.id,
    pid: RUNTIME_INSTANCE.pid,
    port,
    url,
    host: BIND_HOST,
    startedAt: RUNTIME_INSTANCE.startedAt,
    logFile: process.env.TTDASH_BACKGROUND_LOG_FILE || null,
  };
}

function buildBackgroundLogFilePath() {
  return path.join(BACKGROUND_LOG_DIR, `server-${Date.now()}.log`);
}

async function waitForBackgroundInstance(pid, timeoutMs = BACKGROUND_START_TIMEOUT_MS) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const instance = (await getBackgroundInstances()).find((entry) => entry.pid === pid);
    if (instance) {
      return instance;
    }

    if (!isProcessRunning(pid)) {
      return null;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return null;
}

async function waitForBackgroundInstanceExit(instance, timeoutMs = 5000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!(await isBackgroundInstanceOwned(instance))) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return !(await isBackgroundInstanceOwned(instance));
}

function formatBackgroundInstanceLabel(instance, index) {
  const parts = [
    `${index + 1}. ${instance.url}`,
    `PID ${instance.pid}`,
    `Port ${instance.port}`,
    `started ${formatDateTime(instance.startedAt)}`,
  ];

  if (instance.logFile) {
    parts.push(`log ${instance.logFile}`);
  }

  return parts.join(' | ');
}

async function promptForBackgroundInstance(instances) {
  if (instances.length === 1) {
    return instances[0];
  }

  console.log('Multiple TTDash background servers are running:');
  instances.forEach((instance, index) => {
    console.log(`  ${formatBackgroundInstanceLabel(instance, index)}`);
  });
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const answer = (
        await rl.question(
          `Which instance should be stopped? [1-${instances.length}, Enter=cancel] `,
        )
      ).trim();

      if (!answer) {
        return null;
      }

      const selection = Number.parseInt(answer, 10);
      if (Number.isInteger(selection) && selection >= 1 && selection <= instances.length) {
        return instances[selection - 1];
      }

      console.log(`Invalid selection: ${answer}`);
    }
  } finally {
    rl.close();
  }
}

async function stopBackgroundInstance(instance) {
  if (!(await isBackgroundInstanceOwned(instance))) {
    await unregisterBackgroundInstance(instance.pid);
    return {
      status: 'already-stopped',
      instance,
    };
  }

  try {
    process.kill(instance.pid, 'SIGTERM');
  } catch (error) {
    if (error && error.code === 'ESRCH') {
      await unregisterBackgroundInstance(instance.pid);
      return {
        status: 'already-stopped',
        instance,
      };
    }

    if (error && error.code === 'EPERM') {
      return {
        status: 'forbidden',
        instance,
      };
    }

    throw error;
  }

  if (await waitForBackgroundInstanceExit(instance)) {
    await unregisterBackgroundInstance(instance.pid);
    return {
      status: 'stopped',
      instance,
    };
  }

  return {
    status: 'timeout',
    instance,
  };
}

async function runStopCommand() {
  ensureAppDirs();

  const instances = await pruneBackgroundInstances();
  if (instances.length === 0) {
    console.log('No running TTDash background servers found.');
    return;
  }

  const selectedInstance = await promptForBackgroundInstance(instances);
  if (!selectedInstance) {
    console.log('Canceled.');
    return;
  }

  const result = await stopBackgroundInstance(selectedInstance);
  if (result.status === 'stopped') {
    console.log(
      `Stopped TTDash background server: ${selectedInstance.url} (PID ${selectedInstance.pid})`,
    );
    return;
  }

  if (result.status === 'already-stopped') {
    console.log(
      `Instance was already stopped and was removed from the registry: ${selectedInstance.url} (PID ${selectedInstance.pid})`,
    );
    return;
  }

  if (result.status === 'forbidden') {
    console.error(
      `Could not stop TTDash background server (permission denied): ${selectedInstance.url} (PID ${selectedInstance.pid})`,
    );
    process.exitCode = 1;
    return;
  }

  console.error(
    `TTDash background server did not respond to SIGTERM: ${selectedInstance.url} (PID ${selectedInstance.pid})`,
  );
  if (selectedInstance.logFile) {
    console.error(`Log file: ${selectedInstance.logFile}`);
  }
  process.exitCode = 1;
}

function shouldBackgroundChildOpenBrowser() {
  return !(CLI_OPTIONS.noOpen || process.env.NO_OPEN_BROWSER === '1' || process.env.CI === '1');
}

async function startInBackground() {
  ensureBindHostAllowed(BIND_HOST, ALLOW_REMOTE_BIND);
  ensureAppDirs();

  const logFile = buildBackgroundLogFilePath();
  const childArgs = NORMALIZED_CLI_ARGS.filter((arg) => arg !== '--background');
  const logFd = fs.openSync(logFile, 'a', SECURE_FILE_MODE);
  if (!IS_WINDOWS) {
    fs.fchmodSync(logFd, SECURE_FILE_MODE);
  }

  let child;
  try {
    child = spawn(process.execPath, [__filename, ...childArgs], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: {
        ...process.env,
        TTDASH_BACKGROUND_CHILD: '1',
        TTDASH_BACKGROUND_LOG_FILE: logFile,
        TTDASH_FORCE_OPEN_BROWSER: shouldBackgroundChildOpenBrowser() ? '1' : '0',
      },
    });
  } finally {
    fs.closeSync(logFd);
  }

  child.unref();

  const instance = await waitForBackgroundInstance(child.pid);
  if (!instance) {
    const logOutput = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8').trim() : '';
    throw new Error(logOutput || `Could not start TTDash as a background process. Log: ${logFile}`);
  }

  console.log('TTDash is running in the background.');
  console.log(`  URL:  ${instance.url}`);
  console.log(`  PID:  ${instance.pid}`);
  console.log(`  Log:  ${logFile}`);
  console.log('');
  console.log('Stop it with:');
  console.log('  ttdash stop');
}

function migrateLegacyDataFile() {
  if (!fs.existsSync(LEGACY_DATA_FILE) || fs.existsSync(DATA_FILE)) {
    return;
  }

  ensureDir(path.dirname(DATA_FILE));

  try {
    fs.renameSync(LEGACY_DATA_FILE, DATA_FILE);
    console.log(`Migrating existing data to ${DATA_FILE}`);
  } catch {
    fs.copyFileSync(LEGACY_DATA_FILE, DATA_FILE);
    try {
      fs.unlinkSync(LEGACY_DATA_FILE);
    } catch {
      // Ignore best-effort cleanup failures after copying legacy data.
    }
    console.log(`Copying existing data to ${DATA_FILE}`);
  }
}

function normalizeLanguage(value) {
  return value === 'en' ? 'en' : 'de';
}

function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

function normalizeViewMode(value) {
  return value === 'monthly' || value === 'yearly' ? value : 'daily';
}

function normalizeDashboardDatePreset(value) {
  return DASHBOARD_DATE_PRESETS.includes(value) ? value : 'all';
}

function normalizeLastLoadSource(value) {
  return value === 'file' || value === 'auto-import' || value === 'cli-auto-load' ? value : null;
}

function normalizeIsoTimestamp(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function createPersistedStateError(kind, filePath, cause) {
  const label = kind === 'settings' ? 'Settings file' : 'Usage data file';
  const error = new Error(`${label} is unreadable or corrupted.`);
  error.code = 'PERSISTED_STATE_INVALID';
  error.kind = kind;
  error.filePath = filePath;
  error.cause = cause;
  return error;
}

function isPersistedStateError(error, kind) {
  return (
    Boolean(error) &&
    error.code === 'PERSISTED_STATE_INVALID' &&
    (kind ? error.kind === kind : true)
  );
}

function isPayloadTooLargeError(error) {
  return Boolean(error) && error.code === 'PAYLOAD_TOO_LARGE';
}

function readJsonFile(filePath, kind) {
  try {
    return {
      status: 'ok',
      value: JSON.parse(fs.readFileSync(filePath, 'utf-8')),
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        status: 'missing',
        value: null,
      };
    }

    throw createPersistedStateError(kind, filePath, error);
  }
}

function sanitizeCurrency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Number(value.toFixed(2)));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createAutoImportMessageEvent(key, vars = {}) {
  return {
    key,
    vars,
  };
}

function createAutoImportError(message, key, vars = {}) {
  const error = new Error(message);
  error.messageKey = key;
  error.messageVars = vars;
  return error;
}

function toAutoImportErrorEvent(error) {
  if (error && typeof error.messageKey === 'string') {
    return createAutoImportMessageEvent(error.messageKey, error.messageVars || {});
  }

  return createAutoImportMessageEvent('errorPrefix', {
    message: error && error.message ? error.message : 'Unknown error',
  });
}

function formatAutoImportMessageEvent(event) {
  switch (event?.key) {
    case 'startingLocalImport':
      return 'Starting local toktrack import...';
    case 'loadingUsageData':
      return `Loading usage data via ${event.vars?.command || 'unknown command'}...`;
    case 'processingUsageData':
      return `Processing usage data... (${event.vars?.seconds || 0}s)`;
    case 'autoImportRunning':
      return 'An auto-import is already running. Please wait.';
    case 'noRunnerFound':
      return 'No local toktrack, Bun, or npm exec installation found.';
    case 'errorPrefix':
      return `Error: ${event.vars?.message || 'Unknown error'}`;
    default:
      return 'Auto-import update';
  }
}

function computeUsageTotals(daily) {
  return daily.reduce(
    (totals, day) => ({
      inputTokens: totals.inputTokens + (day.inputTokens || 0),
      outputTokens: totals.outputTokens + (day.outputTokens || 0),
      cacheCreationTokens: totals.cacheCreationTokens + (day.cacheCreationTokens || 0),
      cacheReadTokens: totals.cacheReadTokens + (day.cacheReadTokens || 0),
      thinkingTokens: totals.thinkingTokens + (day.thinkingTokens || 0),
      totalCost: totals.totalCost + (day.totalCost || 0),
      totalTokens: totals.totalTokens + (day.totalTokens || 0),
      requestCount: totals.requestCount + (day.requestCount || 0),
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalCost: 0,
      totalTokens: 0,
      requestCount: 0,
    },
  );
}

function sortStrings(values) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : []).filter(
        (value) => typeof value === 'string' && value.trim(),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function canonicalizeModelBreakdown(entry) {
  return {
    modelName: typeof entry?.modelName === 'string' ? entry.modelName : '',
    inputTokens: Number(entry?.inputTokens) || 0,
    outputTokens: Number(entry?.outputTokens) || 0,
    cacheCreationTokens: Number(entry?.cacheCreationTokens) || 0,
    cacheReadTokens: Number(entry?.cacheReadTokens) || 0,
    thinkingTokens: Number(entry?.thinkingTokens) || 0,
    cost: Number(entry?.cost) || 0,
    requestCount: Number(entry?.requestCount) || 0,
  };
}

function canonicalizeUsageDay(day) {
  return {
    date: typeof day?.date === 'string' ? day.date : '',
    inputTokens: Number(day?.inputTokens) || 0,
    outputTokens: Number(day?.outputTokens) || 0,
    cacheCreationTokens: Number(day?.cacheCreationTokens) || 0,
    cacheReadTokens: Number(day?.cacheReadTokens) || 0,
    thinkingTokens: Number(day?.thinkingTokens) || 0,
    totalTokens: Number(day?.totalTokens) || 0,
    totalCost: Number(day?.totalCost) || 0,
    requestCount: Number(day?.requestCount) || 0,
    modelsUsed: sortStrings(day?.modelsUsed),
    modelBreakdowns: (Array.isArray(day?.modelBreakdowns) ? day.modelBreakdowns : [])
      .map(canonicalizeModelBreakdown)
      .sort((left, right) => left.modelName.localeCompare(right.modelName)),
  };
}

function areUsageDaysEquivalent(left, right) {
  return JSON.stringify(canonicalizeUsageDay(left)) === JSON.stringify(canonicalizeUsageDay(right));
}

function extractSettingsImportPayload(payload) {
  if (!isPlainObject(payload)) {
    throw new Error('Uploaded JSON is not a settings backup file.');
  }

  if (payload.kind === SETTINGS_BACKUP_KIND) {
    if (!Object.prototype.hasOwnProperty.call(payload, 'settings')) {
      throw new Error('The settings backup file does not contain any settings.');
    }
    if (!isPlainObject(payload.settings)) {
      throw new Error('The settings backup file has an invalid settings payload.');
    }
    return payload.settings;
  }

  if (typeof payload.kind === 'string' && payload.kind === USAGE_BACKUP_KIND) {
    throw new Error('This is a data backup file, not a settings file.');
  }

  throw new Error('Uploaded JSON is not a settings backup file.');
}

function extractUsageImportPayload(payload) {
  if (!isPlainObject(payload)) {
    return payload;
  }

  if (payload.kind === USAGE_BACKUP_KIND) {
    if (!Object.prototype.hasOwnProperty.call(payload, 'data')) {
      throw new Error('The usage backup file does not contain any usage data.');
    }
    return payload.data;
  }

  if (typeof payload.kind === 'string' && payload.kind === SETTINGS_BACKUP_KIND) {
    throw new Error('This is a settings backup file, not a data file.');
  }

  return payload;
}

function mergeUsageData(currentData, importedData) {
  const current =
    currentData && Array.isArray(currentData.daily) && currentData.daily.length > 0
      ? normalizeIncomingData(currentData)
      : null;

  if (!current) {
    return {
      data: importedData,
      summary: {
        importedDays: importedData.daily.length,
        addedDays: importedData.daily.length,
        unchangedDays: 0,
        conflictingDays: 0,
        totalDays: importedData.daily.length,
      },
    };
  }

  const currentByDate = new Map(current.daily.map((day) => [day.date, day]));
  let addedDays = 0;
  let unchangedDays = 0;
  let conflictingDays = 0;

  for (const importedDay of importedData.daily) {
    const existingDay = currentByDate.get(importedDay.date);
    if (!existingDay) {
      currentByDate.set(importedDay.date, importedDay);
      addedDays += 1;
      continue;
    }

    if (areUsageDaysEquivalent(existingDay, importedDay)) {
      unchangedDays += 1;
      continue;
    }

    conflictingDays += 1;
  }

  const mergedDaily = [...currentByDate.values()].sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  return {
    data: {
      daily: mergedDaily,
      totals: computeUsageTotals(mergedDaily),
    },
    summary: {
      importedDays: importedData.daily.length,
      addedDays,
      unchangedDays,
      conflictingDays,
      totalDays: mergedDaily.length,
    },
  };
}

function normalizeProviderLimitConfig(value) {
  if (!value || typeof value !== 'object') {
    return {
      hasSubscription: false,
      subscriptionPrice: 0,
      monthlyLimit: 0,
    };
  }

  return {
    hasSubscription: Boolean(value.hasSubscription),
    subscriptionPrice: sanitizeCurrency(value.subscriptionPrice),
    monthlyLimit: sanitizeCurrency(value.monthlyLimit),
  };
}

function normalizeProviderLimits(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const next = {};
  for (const [provider, config] of Object.entries(value)) {
    next[provider] = normalizeProviderLimitConfig(config);
  }
  return next;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((entry) => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeDefaultFilters(value) {
  const source = value && typeof value === 'object' ? value : {};

  return {
    viewMode: normalizeViewMode(source.viewMode),
    datePreset: normalizeDashboardDatePreset(source.datePreset),
    providers: normalizeStringList(source.providers),
    models: normalizeStringList(source.models),
  };
}

function normalizeSectionVisibility(value) {
  const source = value && typeof value === 'object' ? value : {};
  const next = {};

  for (const sectionId of DASHBOARD_SECTION_IDS) {
    next[sectionId] = typeof source[sectionId] === 'boolean' ? source[sectionId] : true;
  }

  return next;
}

function normalizeSectionOrder(value) {
  if (!Array.isArray(value)) {
    return [...DASHBOARD_SECTION_IDS];
  }

  const incoming = value.filter(
    (sectionId) => typeof sectionId === 'string' && DASHBOARD_SECTION_IDS.includes(sectionId),
  );
  const uniqueIncoming = [...new Set(incoming)];
  const missing = DASHBOARD_SECTION_IDS.filter((sectionId) => !uniqueIncoming.includes(sectionId));

  return [...uniqueIncoming, ...missing];
}

function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    language: normalizeLanguage(source.language),
    theme: normalizeTheme(source.theme),
    providerLimits: normalizeProviderLimits(source.providerLimits),
    defaultFilters: normalizeDefaultFilters(source.defaultFilters),
    sectionVisibility: normalizeSectionVisibility(source.sectionVisibility),
    sectionOrder: normalizeSectionOrder(source.sectionOrder),
    lastLoadedAt: normalizeIsoTimestamp(source.lastLoadedAt),
    lastLoadSource: normalizeLastLoadSource(source.lastLoadSource),
  };
}

function toSettingsResponse(settings) {
  return {
    ...normalizeSettings(settings),
    cliAutoLoadActive: startupAutoLoadCompleted,
  };
}

function openBrowser(url) {
  if (!shouldOpenBrowser()) {
    return;
  }

  const platform = process.platform;
  const command = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {});
  child.unref();
}

function shouldOpenBrowser() {
  if (CLI_OPTIONS.noOpen || process.env.NO_OPEN_BROWSER === '1' || process.env.CI === '1') {
    return false;
  }

  if (FORCE_OPEN_BROWSER) {
    return true;
  }

  return Boolean(process.stdout.isTTY);
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
  if (!fs.existsSync(DATA_FILE)) {
    return 'no local file found';
  }

  try {
    const normalized = readData();
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

  console.log('');
  console.log(`${APP_LABEL} v${APP_VERSION} is ready`);
  console.log(`  URL:            ${url}`);
  console.log(`  API:            ${url}/api/usage`);
  console.log(`  Port:           ${port}`);
  console.log(`  Host:           ${BIND_HOST}`);
  if (remoteBind) {
    console.log(`  Exposure:       network-accessible via ${BIND_HOST}`);
  }
  console.log(`  Mode:           ${runtimeMode}`);
  console.log(`  Static Root:    ${STATIC_ROOT}`);
  console.log(`  Data File:      ${DATA_FILE}`);
  console.log(`  Settings File:  ${SETTINGS_FILE}`);
  if (IS_BACKGROUND_CHILD && process.env.TTDASH_BACKGROUND_LOG_FILE) {
    console.log(`  Log File:       ${process.env.TTDASH_BACKGROUND_LOG_FILE}`);
  }
  console.log(`  Data Status:    ${describeDataFile()}`);
  console.log(`  Browser Open:   ${browserMode}`);
  console.log(`  Auto-Load:      ${autoLoadMode}`);
  if (remoteBind) {
    console.log('');
    console.log(
      'Security warning: this bind host can expose local data and destructive API routes.',
    );
    console.log('Use non-loopback hosts only on trusted networks.');
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
  console.log(`  TTDASH_ALLOW_REMOTE=1 HOST=${BIND_HOST} PORT=${port} node server.js`);
  console.log(`  curl ${url}/api/usage`);
  console.log('');
}

function getCacheControl(filePath) {
  if (filePath.includes(path.sep + 'assets' + path.sep)) {
    return 'public, max-age=31536000, immutable';
  }
  if (filePath.endsWith('.html')) {
    return 'no-cache';
  }
  return 'public, max-age=86400';
}

function serveFile(res, reqPath) {
  const ext = path.extname(reqPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(reqPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(STATIC_ROOT, 'index.html'), (err2, html) => {
          if (err2) {
            res.writeHead(500);
            res.end('Internal Server Error');
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
            ...SECURITY_HEADERS,
          });
          res.end(html);
        });
        return;
      }
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': getCacheControl(reqPath),
      ...SECURITY_HEADERS,
    });
    res.end(data);
  });
}

// --- API helpers ---

function readData() {
  const file = readJsonFile(DATA_FILE, 'usage');
  if (file.status === 'missing') {
    return null;
  }

  try {
    return normalizeIncomingData(file.value);
  } catch (error) {
    throw createPersistedStateError('usage', DATA_FILE, error);
  }
}

async function writeData(data) {
  await writeJsonAtomicAsync(DATA_FILE, data);
}

function readSettings() {
  const file = readJsonFile(SETTINGS_FILE, 'settings');
  if (file.status === 'missing') {
    return toSettingsResponse({
      ...DEFAULT_SETTINGS,
      providerLimits: {},
    });
  }

  return toSettingsResponse(file.value);
}

function readSettingsForWrite() {
  try {
    return readSettings();
  } catch (error) {
    if (isPersistedStateError(error, 'settings')) {
      return toSettingsResponse({
        ...DEFAULT_SETTINGS,
        providerLimits: {},
      });
    }

    throw error;
  }
}

async function writeSettings(settings) {
  await writeJsonAtomicAsync(SETTINGS_FILE, normalizeSettings(settings));
}

async function updateDataLoadState(patch) {
  const current = readSettingsForWrite();
  const next = {
    ...current,
    ...patch,
  };

  await writeSettings(next);
  return toSettingsResponse(next);
}

async function updateSettings(patch) {
  return withFileMutationLock(SETTINGS_FILE, async () => {
    const current = readSettingsForWrite();
    const next = {
      ...current,
      ...(patch && typeof patch === 'object' ? patch : {}),
    };

    if (patch && Object.prototype.hasOwnProperty.call(patch, 'providerLimits')) {
      next.providerLimits = normalizeProviderLimits(patch.providerLimits);
    } else {
      next.providerLimits = current.providerLimits;
    }

    next.language = normalizeLanguage(next.language);
    next.theme = normalizeTheme(next.theme);

    await writeSettings(next);
    return toSettingsResponse(next);
  });
}

const { json, readBody, resolveApiPath, sendBuffer, validateMutationRequest } = createHttpUtils({
  apiPrefix: API_PREFIX,
  maxBodySize: MAX_BODY_SIZE,
  securityHeaders: SECURITY_HEADERS,
});

// --- SSE helpers ---

function sendSSE(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

let autoImportRunning = false;

function getExecutableName(baseName, isWindows = IS_WINDOWS) {
  if (!isWindows) {
    return baseName;
  }

  switch (baseName) {
    case 'bun':
    case 'bunx':
      return 'bun.exe';
    case 'npx':
      return 'npx.cmd';
    default:
      return baseName;
  }
}

function spawnCommand(command, args, options = {}) {
  // cross-spawn resolves Windows command shims without relying on shell=true,
  // which avoids the DEP0190 warning from Node's child_process APIs.
  return spawnCrossPlatform(command, args, {
    ...options,
    windowsHide: options.windowsHide ?? true,
  });
}

function commandExists(command, args = ['--version']) {
  return new Promise((resolve) => {
    const child = spawnCommand(command, args, { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

async function resolveToktrackRunner() {
  if (fs.existsSync(TOKTRACK_LOCAL_BIN)) {
    return {
      command: TOKTRACK_LOCAL_BIN,
      prefixArgs: [],
      env: process.env,
      method: 'local',
      label: 'local toktrack',
      displayCommand: 'node_modules/.bin/toktrack daily --json',
    };
  }

  if (await commandExists(getExecutableName('bun'))) {
    return {
      command: getExecutableName('bunx'),
      prefixArgs: IS_WINDOWS ? ['x', 'toktrack'] : ['toktrack'],
      env: process.env,
      method: 'bunx',
      label: 'bunx',
      displayCommand: 'bunx toktrack daily --json',
    };
  }

  if (await commandExists(getExecutableName('npx'))) {
    return {
      command: getExecutableName('npx'),
      prefixArgs: ['--yes', 'toktrack'],
      env: {
        ...process.env,
        npm_config_cache: NPX_CACHE_DIR,
      },
      method: 'npm',
      label: 'npm exec',
      displayCommand: 'npx --yes toktrack daily --json',
    };
  }

  return null;
}

function runToktrack(runner, args, { streamStderr = false, onStderr, signalOnClose } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(runner.command, [...runner.prefixArgs, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: runner.env,
    });

    let stdout = '';
    let stderr = '';

    if (signalOnClose) {
      signalOnClose(() => child.kill('SIGTERM'));
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      const line = chunk.toString();
      stderr += line;
      if (streamStderr && onStderr && line.trim()) {
        onStderr(line.trimEnd());
      }
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trimEnd());
        return;
      }
      reject(new Error(stderr.trim() || `Could not start ${runner.label}.`));
    });
  });
}

async function performAutoImport({
  source = 'auto-import',
  onCheck = () => {},
  onProgress = () => {},
  onOutput = () => {},
  signalOnClose,
} = {}) {
  if (autoImportRunning) {
    throw createAutoImportError(
      'An auto-import is already running. Please wait.',
      'autoImportRunning',
    );
  }

  autoImportRunning = true;
  let progressSeconds = 0;
  const progressInterval = setInterval(() => {
    progressSeconds += 5;
    onProgress(createAutoImportMessageEvent('processingUsageData', { seconds: progressSeconds }));
  }, 5000);

  try {
    onCheck({ tool: 'toktrack', status: 'checking' });
    onProgress(createAutoImportMessageEvent('startingLocalImport'));

    const runner = await resolveToktrackRunner();
    if (!runner) {
      onCheck({ tool: 'toktrack', status: 'not_found' });
      throw createAutoImportError(
        'No local toktrack, Bun, or npm exec installation found.',
        'noRunnerFound',
      );
    }

    const versionResult = await runToktrack(runner, ['--version']);
    onCheck({
      tool: 'toktrack',
      status: 'found',
      method: runner.label,
      version: String(versionResult).replace(/^toktrack\s+/, ''),
    });
    onProgress(
      createAutoImportMessageEvent('loadingUsageData', {
        command: runner.displayCommand,
      }),
    );

    const rawJson = await runToktrack(runner, ['daily', '--json'], {
      streamStderr: true,
      onStderr: (line) => {
        onOutput(line);
      },
      signalOnClose,
    });

    const normalized = normalizeIncomingData(JSON.parse(rawJson));
    await withSettingsAndDataMutationLock(async () => {
      await writeData(normalized);
      await updateDataLoadState({
        lastLoadedAt: new Date().toISOString(),
        lastLoadSource: source,
      });
    });

    return {
      days: normalized.daily.length,
      totalCost: normalized.totals.totalCost,
    };
  } finally {
    clearInterval(progressInterval);
    autoImportRunning = false;
  }
}

async function runStartupAutoLoad({ source = 'cli-auto-load' } = {}) {
  console.log('Auto-load enabled, starting import...');

  try {
    const result = await performAutoImport({
      source,
      onCheck: (event) => {
        if (event.status === 'found') {
          console.log(`toktrack found (${event.method}, v${event.version})`);
        }
      },
      onProgress: (event) => {
        console.log(formatAutoImportMessageEvent(event));
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

// --- Server ---

const server = http.createServer(async (req, res) => {
  let url;
  let pathname;

  try {
    url = new URL(req.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return json(res, 400, { message: 'Invalid request path' });
  }

  // API routing
  const apiPath = resolveApiPath(pathname);

  if (apiPath === null && (pathname === '/api' || pathname.startsWith('/api/'))) {
    return json(res, 404, { message: 'Not Found' });
  }

  if (apiPath === '/usage') {
    if (req.method === 'GET') {
      let data;
      try {
        data = readData();
      } catch (error) {
        if (isPersistedStateError(error, 'usage')) {
          return json(res, 500, { message: error.message });
        }
        throw error;
      }
      return json(
        res,
        200,
        data || {
          daily: [],
          totals: {
            inputTokens: 0,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            totalCost: 0,
            totalTokens: 0,
            requestCount: 0,
          },
        },
      );
    }
    if (req.method === 'DELETE') {
      const validationError = validateMutationRequest(req);
      if (validationError) {
        return json(res, validationError.status, { message: validationError.message });
      }
      await withSettingsAndDataMutationLock(async () => {
        await unlinkIfExists(DATA_FILE);
        await updateDataLoadState({
          lastLoadedAt: null,
          lastLoadSource: null,
        });
      });
      return json(res, 200, { success: true });
    }
    return json(res, 405, { message: 'Method Not Allowed' });
  }

  if (apiPath === '/runtime') {
    if (req.method !== 'GET') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    return json(res, 200, {
      id: RUNTIME_INSTANCE.id,
      pid: RUNTIME_INSTANCE.pid,
      startedAt: RUNTIME_INSTANCE.startedAt,
      mode: RUNTIME_INSTANCE.mode,
      port: runtimePort,
      url: runtimeUrl,
    });
  }

  if (apiPath === '/settings') {
    if (req.method === 'GET') {
      try {
        return json(res, 200, readSettings());
      } catch (error) {
        if (isPersistedStateError(error, 'settings')) {
          return json(res, 500, { message: error.message });
        }
        throw error;
      }
    }

    if (req.method === 'DELETE') {
      const validationError = validateMutationRequest(req);
      if (validationError) {
        return json(res, validationError.status, { message: validationError.message });
      }
      await withFileMutationLock(SETTINGS_FILE, async () => {
        await unlinkIfExists(SETTINGS_FILE);
      });
      return json(res, 200, { success: true, settings: readSettings() });
    }

    if (req.method === 'PATCH') {
      const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
      if (validationError) {
        return json(res, validationError.status, { message: validationError.message });
      }
      try {
        const body = await readBody(req);
        return json(res, 200, await updateSettings(body));
      } catch (e) {
        if (isPayloadTooLargeError(e)) {
          return json(res, 413, { message: 'Settings request too large' });
        }
        return json(res, 400, { message: e.message || 'Invalid settings request' });
      }
    }

    return json(res, 405, { message: 'Method Not Allowed' });
  }

  if (apiPath === '/settings/import') {
    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
    if (validationError) {
      return json(res, validationError.status, { message: validationError.message });
    }

    try {
      const body = await readBody(req);
      const importedSettings = normalizeSettings(extractSettingsImportPayload(body));
      await withFileMutationLock(SETTINGS_FILE, async () => {
        await writeSettings(importedSettings);
      });
      return json(res, 200, toSettingsResponse(importedSettings));
    } catch (e) {
      if (isPayloadTooLargeError(e)) {
        return json(res, 413, { message: 'Settings file too large' });
      }
      return json(res, 400, { message: e.message || 'Invalid settings file' });
    }
  }

  if (apiPath === '/upload') {
    if (req.method === 'POST') {
      const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
      if (validationError) {
        return json(res, validationError.status, { message: validationError.message });
      }

      try {
        const body = await readBody(req);
        const normalized = normalizeIncomingData(body);
        await withSettingsAndDataMutationLock(async () => {
          await writeData(normalized);
          await updateDataLoadState({
            lastLoadedAt: new Date().toISOString(),
            lastLoadSource: 'file',
          });
        });
        const days = normalized.daily.length;
        const totalCost = normalized.totals.totalCost;
        return json(res, 200, { days, totalCost });
      } catch (e) {
        const status = isPayloadTooLargeError(e) ? 413 : 400;
        const message = isPayloadTooLargeError(e)
          ? 'File too large (max. 10 MB)'
          : e.message || 'Invalid JSON';
        return json(res, status, { message });
      }
    }
    return json(res, 405, { message: 'Method Not Allowed' });
  }

  if (apiPath === '/usage/import') {
    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
    if (validationError) {
      return json(res, validationError.status, { message: validationError.message });
    }

    try {
      const body = await readBody(req);
      const importedData = normalizeIncomingData(extractUsageImportPayload(body));
      const result = await withSettingsAndDataMutationLock(async () => {
        const currentData = readData();
        const merged = mergeUsageData(currentData, importedData);
        await writeData(merged.data);
        await updateDataLoadState({
          lastLoadedAt: new Date().toISOString(),
          lastLoadSource: 'file',
        });
        return merged;
      });
      return json(res, 200, result.summary);
    } catch (e) {
      if (isPayloadTooLargeError(e)) {
        return json(res, 413, { message: 'Usage backup file too large' });
      }
      if (isPersistedStateError(e, 'usage')) {
        return json(res, 500, { message: e.message });
      }
      return json(res, 400, { message: e.message || 'Invalid usage backup file' });
    }
  }

  if (apiPath === '/auto-import/stream') {
    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    const validationError = validateMutationRequest(req);
    if (validationError) {
      return json(res, validationError.status, { message: validationError.message });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...SECURITY_HEADERS,
    });

    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });

    try {
      const result = await performAutoImport({
        source: 'auto-import',
        onCheck: (event) => {
          if (!aborted) {
            sendSSE(res, 'check', event);
          }
        },
        onProgress: (event) => {
          if (!aborted) {
            sendSSE(res, 'progress', event);
          }
        },
        onOutput: (line) => {
          if (!aborted) {
            sendSSE(res, 'stderr', { line });
          }
        },
        signalOnClose: (close) => {
          req.on('close', close);
        },
      });

      if (aborted) {
        return;
      }

      sendSSE(res, 'success', result);
      sendSSE(res, 'done', {});
      res.end();
    } catch (err) {
      if (aborted) {
        return;
      }
      sendSSE(res, 'error', toAutoImportErrorEvent(err));
      sendSSE(res, 'done', {});
      res.end();
    }
    return;
  }

  if (apiPath === '/report/pdf') {
    if (req.method !== 'POST') {
      return json(res, 405, { message: 'Method Not Allowed' });
    }

    const validationError = validateMutationRequest(req, { requiresJsonContentType: true });
    if (validationError) {
      return json(res, validationError.status, { message: validationError.message });
    }

    let data;
    try {
      data = readData();
    } catch (error) {
      if (isPersistedStateError(error, 'usage')) {
        return json(res, 500, { message: error.message });
      }
      throw error;
    }
    if (!data || !Array.isArray(data.daily) || data.daily.length === 0) {
      return json(res, 400, { message: 'No data available for the report.' });
    }

    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      const status = isPayloadTooLargeError(e) ? 413 : 400;
      return json(res, status, {
        message: isPayloadTooLargeError(e) ? 'Report request too large' : 'Invalid report request',
      });
    }

    try {
      const result = await generatePdfReport(data.daily, body || {});
      return sendBuffer(
        res,
        200,
        {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        },
        result.buffer,
      );
    } catch (error) {
      const message = error && error.message ? error.message : 'PDF generation failed';
      const status = error && error.code === 'TYPST_MISSING' ? 503 : 500;
      return json(res, status, { message });
    }
  }

  if (apiPath !== null) {
    return json(res, 404, { message: 'API endpoint not found' });
  }

  // Static file serving
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(STATIC_ROOT, `.${safePath}`);

  if (
    !filePath.startsWith(path.resolve(STATIC_ROOT) + path.sep) &&
    filePath !== path.resolve(STATIC_ROOT, 'index.html')
  ) {
    return json(res, 403, { message: 'Access denied' });
  }

  serveFile(res, filePath);
});

function tryListen(port) {
  return listenOnAvailablePort(server, port, MAX_PORT, BIND_HOST, console.log, START_PORT);
}

async function start() {
  ensureBindHostAllowed(BIND_HOST, ALLOW_REMOTE_BIND);
  ensureAppDirs();
  migrateLegacyDataFile();

  const port = await tryListen(START_PORT);
  const browserHost = BIND_HOST === '0.0.0.0' ? 'localhost' : BIND_HOST;
  const url = `http://${browserHost}:${port}`;
  runtimePort = port;
  runtimeUrl = url;

  if (IS_BACKGROUND_CHILD) {
    await registerBackgroundInstance(createBackgroundInstance({ port, url }));
  }

  if (CLI_OPTIONS.autoLoad) {
    await runStartupAutoLoad({
      source: 'cli-auto-load',
    });
  }

  printStartupSummary(url, port);
  openBrowser(url);
}

async function runCli() {
  if (CLI_OPTIONS.command === 'stop') {
    await runStopCommand();
    return;
  }

  if (CLI_OPTIONS.background && !IS_BACKGROUND_CHILD) {
    await startInBackground();
    return;
  }

  await start();
}

function registerShutdownHandlers() {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

function bootstrapCli() {
  runCli().catch((error) => {
    Promise.resolve()
      .then(async () => {
        if (IS_BACKGROUND_CHILD) {
          await unregisterBackgroundInstance(process.pid);
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
    commandExists,
    getExecutableName,
    listenOnAvailablePort,
    getFileMutationLockDir,
    unlinkIfExists,
    writeJsonAtomicAsync,
    withFileMutationLock,
    withOrderedFileMutationLocks,
    getPendingFileMutationLockCount: () => fileMutationLocks.size,
  },
};

if (require.main === module) {
  bootstrapCli();
}

// Graceful shutdown on Ctrl+C / kill
function shutdown(signal) {
  console.log(`\n${signal} received, shutting down server...`);
  server.close(async () => {
    if (IS_BACKGROUND_CHILD) {
      await unregisterBackgroundInstance(process.pid);
    }
    console.log('Server stopped.');
    process.exit(0);
  });
  // Force exit after 3s if connections don't close
  setTimeout(async () => {
    if (IS_BACKGROUND_CHILD) {
      await unregisterBackgroundInstance(process.pid);
    }
    console.log('Forcing shutdown.');
    process.exit(0);
  }, 3000);
}
