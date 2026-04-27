const http = require('http');
const fs = require('fs');
const fsPromises = require('fs/promises');
const os = require('os');
const path = require('path');
const readline = require('readline/promises');
const { spawn } = require('child_process');
const spawnCrossPlatform = require('cross-spawn');
const { normalizeIncomingData } = require('../usage-normalizer');
const { generatePdfReport } = require('./report');
const { version: APP_VERSION } = require('../package.json');
const {
  TOKTRACK_PACKAGE_NAME,
  TOKTRACK_PACKAGE_SPEC,
  TOKTRACK_VERSION,
} = require('../shared/toktrack-version.js');
const { parseCliArgs, normalizeCliArgs } = require('./cli');
const { createHttpUtils } = require('./http-utils');
const { createDataRuntime } = require('./data-runtime');
const { createBackgroundRuntime } = require('./background-runtime.js');
const { createAutoImportRuntime } = require('./auto-import-runtime');
const { createHttpRouter } = require('./http-router');
const { createServerAuth } = require('./remote-auth');
const { createSecurityHeaders, prepareHtmlResponse } = require('./security-headers');
const { createStartupRuntime } = require('./startup-runtime');
const { createServerLifecycle } = require('./server-lifecycle');
const { sleep, isProcessRunning, formatDateTime } = require('./process-utils');
const { ensureBindHostAllowed, isLoopbackHost, listenOnAvailablePort } = require('./runtime');
const { createServerRuntimeState } = require('./runtime-state');

const ROOT = path.resolve(__dirname, '..');
const APP_DIR_NAME = 'TTDash';
const APP_DIR_NAME_LINUX = 'ttdash';
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB
const SECURE_DIR_MODE = 0o700;
const SECURE_FILE_MODE = 0o600;
const SETTINGS_BACKUP_KIND = 'ttdash-settings-backup';
const USAGE_BACKUP_KIND = 'ttdash-usage-backup';
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

function createAppRuntime({
  processObject = process,
  entrypointPath = path.join(ROOT, 'server.js'),
} = {}) {
  const env = processObject.env || process.env;
  const argv = Array.isArray(processObject.argv) ? processObject.argv : process.argv;
  const staticRoot = path.join(ROOT, 'dist');
  const legacyDataFile = path.join(ROOT, 'data.json');
  const rawCliArgs = argv.slice(2);
  const normalizedCliArgs = normalizeCliArgs(rawCliArgs);
  const cliOptions = parseCliArgs(rawCliArgs, { appVersion: APP_VERSION });
  const envStartPort = parseInt(env.PORT, 10);
  const startPort = cliOptions.port ?? (Number.isFinite(envStartPort) ? envStartPort : 3000);
  const maxPort = Math.min(startPort + 100, 65535);
  const bindHost = env.HOST || '127.0.0.1';
  const allowRemoteBind = env.TTDASH_ALLOW_REMOTE === '1';
  const remoteAuthToken = env.TTDASH_REMOTE_TOKEN || '';
  const localAuthToken = env.TTDASH_LOCAL_AUTH_TOKEN || '';
  const apiPrefix = env.API_PREFIX || '/api';
  const isWindows = processObject.platform === 'win32';
  const toktrackLocalBin =
    env.TTDASH_TOKTRACK_LOCAL_BIN ||
    path.join(ROOT, 'node_modules', '.bin', isWindows ? 'toktrack.cmd' : 'toktrack');
  const securityHeaders = createSecurityHeaders();
  const isBackgroundChild = env.TTDASH_BACKGROUND_CHILD === '1';
  const forceOpenBrowser = env.TTDASH_FORCE_OPEN_BROWSER === '1';
  const runtimeState = createServerRuntimeState({
    id: env.TTDASH_INSTANCE_ID || `${processObject.pid}-${Date.now()}`,
    pid: processObject.pid,
    startedAt: new Date().toISOString(),
    mode: isBackgroundChild ? 'background' : 'foreground',
  });
  const runtimeInstance = runtimeState.getRuntimeInstance();

  const dataRuntime = createDataRuntime({
    fs,
    fsPromises,
    os,
    path,
    processObject,
    normalizeIncomingData,
    runtimeInstanceId: runtimeInstance.id,
    appDirName: APP_DIR_NAME,
    appDirNameLinux: APP_DIR_NAME_LINUX,
    legacyDataFile,
    settingsBackupKind: SETTINGS_BACKUP_KIND,
    usageBackupKind: USAGE_BACKUP_KIND,
    isWindows,
    secureDirMode: SECURE_DIR_MODE,
    secureFileMode: SECURE_FILE_MODE,
    fileMutationLockTimeoutMs: FILE_MUTATION_LOCK_TIMEOUT_MS,
    fileMutationLockStaleMs: FILE_MUTATION_LOCK_STALE_MS,
    getCliAutoLoadActive: runtimeState.isStartupAutoLoadCompleted,
  });
  const localAuthSessionFile = path.join(dataRuntime.appPaths.configDir, 'session-auth.json');
  const serverAuth = createServerAuth({
    bindHost,
    allowRemoteBind,
    remoteToken: remoteAuthToken,
    localToken: localAuthToken || undefined,
  });
  const authorizationHeader = serverAuth.getAuthorizationHeader();

  const backgroundRuntime = createBackgroundRuntime({
    fs,
    path,
    processObject,
    fetchImpl: fetch,
    spawnImpl: spawn,
    readlinePromises: readline,
    entrypointPath,
    appPaths: dataRuntime.appPaths,
    ensureAppDirs: dataRuntime.ensureAppDirs,
    ensureDir: dataRuntime.ensureDir,
    writeJsonAtomic: dataRuntime.writeJsonAtomic,
    normalizeIsoTimestamp: dataRuntime.normalizeIsoTimestamp,
    bindHost,
    apiPrefix,
    authHeader: authorizationHeader,
    remoteAuthHeader: authorizationHeader,
    runtimeInstance,
    normalizedCliArgs,
    cliOptions,
    forceOpenBrowser,
    isWindows,
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
    processObject,
    spawnCrossPlatform,
    normalizeIncomingData,
    withSettingsAndDataMutationLock: dataRuntime.withSettingsAndDataMutationLock,
    writeData: dataRuntime.writeData,
    updateDataLoadState: dataRuntime._updateDataLoadStateUnlocked,
    toktrackPackageName: TOKTRACK_PACKAGE_NAME,
    toktrackPackageSpec: TOKTRACK_PACKAGE_SPEC,
    toktrackVersion: TOKTRACK_VERSION,
    toktrackLocalBin,
    npxCacheDir: dataRuntime.paths.npxCacheDir,
    isWindows,
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
    apiPrefix,
    maxBodySize: MAX_BODY_SIZE,
    securityHeaders,
    bindHost,
  });

  const router = createHttpRouter({
    fs,
    path,
    staticRoot,
    securityHeaders,
    prepareHtmlResponse,
    httpUtils,
    remoteAuth: serverAuth,
    dataRuntime,
    autoImportRuntime,
    generatePdfReport,
    getRuntimeSnapshot: runtimeState.getSnapshot,
  });

  const startupRuntime = createStartupRuntime({
    fs,
    spawnImpl: spawn,
    processObject,
    appLabel: 'TTDash',
    appVersion: APP_VERSION,
    staticRoot,
    dataRuntime,
    serverAuth,
    localAuthSessionFile,
    apiPrefix,
    bindHost,
    cliOptions,
    isBackgroundChild,
    forceOpenBrowser,
    isLoopbackHost,
    autoImportRuntime,
    markStartupAutoLoadCompleted: runtimeState.markStartupAutoLoadCompleted,
  });

  return createServerLifecycle({
    http,
    processObject,
    router,
    httpUtils,
    listenOnAvailablePort,
    ensureBindHostAllowed,
    dataRuntime,
    backgroundRuntime,
    startupRuntime,
    serverAuth,
    runtimeState,
    startPort,
    maxPort,
    bindHost,
    allowRemoteBind,
    cliOptions,
    isBackgroundChild,
  });
}

module.exports = {
  createAppRuntime,
};
