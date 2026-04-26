#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');
const readline = require('readline/promises');
const { spawn } = require('child_process');
const spawnCrossPlatform = require('cross-spawn');
const { normalizeIncomingData } = require('./usage-normalizer');
const { generatePdfReport } = require('./server/report');
const { version: APP_VERSION } = require('./package.json');
const {
  TOKTRACK_PACKAGE_NAME,
  TOKTRACK_PACKAGE_SPEC,
  TOKTRACK_VERSION,
} = require('./shared/toktrack-version.js');
const { parseCliArgs, normalizeCliArgs } = require('./server/cli');
const { createHttpUtils } = require('./server/http-utils');
const { createDataRuntime } = require('./server/data-runtime');
const { createBackgroundRuntime } = require('./server/background-runtime');
const { createAutoImportRuntime } = require('./server/auto-import-runtime');
const { createHttpRouter } = require('./server/http-router');
const { createServerAuth } = require('./server/remote-auth');
const { createSecurityHeaders, prepareHtmlResponse } = require('./server/security-headers');
const { createStartupRuntime } = require('./server/startup-runtime');
const { createServerLifecycle } = require('./server/server-lifecycle');
const { sleep, isProcessRunning, formatDateTime } = require('./server/process-utils');
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
const CLI_OPTIONS = parseCliArgs(RAW_CLI_ARGS, { appVersion: APP_VERSION });
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
const SECURITY_HEADERS = createSecurityHeaders();
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

const runtimeFlags = {
  startupAutoLoadCompleted: false,
};
const runtimeState = {
  port: null,
  url: null,
};
const RUNTIME_INSTANCE = {
  id: process.env.TTDASH_INSTANCE_ID || `${process.pid}-${Date.now()}`,
  pid: process.pid,
  startedAt: new Date().toISOString(),
  mode: IS_BACKGROUND_CHILD ? 'background' : 'foreground',
};

const dataRuntime = createDataRuntime({
  fs,
  fsPromises,
  os,
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
  getCliAutoLoadActive: () => runtimeFlags.startupAutoLoadCompleted,
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
  prepareHtmlResponse,
  httpUtils,
  remoteAuth: serverAuth,
  dataRuntime,
  autoImportRuntime,
  generatePdfReport,
  getRuntimeSnapshot: () => ({
    id: RUNTIME_INSTANCE.id,
    mode: RUNTIME_INSTANCE.mode,
    port: runtimeState.port,
    url: runtimeState.url,
  }),
});

const startupRuntime = createStartupRuntime({
  fs,
  spawnImpl: spawn,
  processObject: process,
  appLabel: APP_LABEL,
  appVersion: APP_VERSION,
  staticRoot: STATIC_ROOT,
  dataRuntime,
  serverAuth,
  localAuthSessionFile: LOCAL_AUTH_SESSION_FILE,
  apiPrefix: API_PREFIX,
  bindHost: BIND_HOST,
  cliOptions: CLI_OPTIONS,
  isBackgroundChild: IS_BACKGROUND_CHILD,
  forceOpenBrowser: FORCE_OPEN_BROWSER,
  isLoopbackHost,
  autoImportRuntime,
  setStartupAutoLoadCompleted: (value) => {
    runtimeFlags.startupAutoLoadCompleted = value;
  },
});

const serverLifecycle = createServerLifecycle({
  http,
  processObject: process,
  router,
  httpUtils,
  listenOnAvailablePort,
  ensureBindHostAllowed,
  dataRuntime,
  backgroundRuntime,
  startupRuntime,
  serverAuth,
  runtimeState,
  runtimeInstance: RUNTIME_INSTANCE,
  startPort: START_PORT,
  maxPort: MAX_PORT,
  bindHost: BIND_HOST,
  allowRemoteBind: ALLOW_REMOTE_BIND,
  cliOptions: CLI_OPTIONS,
  isBackgroundChild: IS_BACKGROUND_CHILD,
});

module.exports = {
  bootstrapCli: serverLifecycle.bootstrapCli,
  runCli: serverLifecycle.runCli,
};

if (require.main === module) {
  serverLifecycle.bootstrapCli();
}
