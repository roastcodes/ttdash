const {
  createDefaultPersistedAppSettings,
  normalizeIsoTimestamp: normalizeSharedIsoTimestamp,
  normalizePersistedAppSettings,
  normalizeProviderLimits: normalizeSharedProviderLimits,
} = require('../shared/app-settings.js');
const { resolveDataRuntimeAppPaths } = require('./data-runtime/app-paths');
const { createDataRuntimeFileIo } = require('./data-runtime/file-io');
const { createDataRuntimeFileLocks } = require('./data-runtime/file-locks');
const { createDataRuntimeImportMerge } = require('./data-runtime/import-merge');
const { createSystemDataRuntime, mergeUsageDatasets } = require('./data-runtime/system-data');

/** Creates the persistence, locking, import, and settings runtime facade. */
function createDataRuntime({
  fs,
  fsPromises,
  os,
  path,
  processObject = process,
  normalizeIncomingData,
  runtimeInstanceId,
  appDirName,
  appDirNameLinux,
  legacyDataFile,
  settingsBackupKind,
  usageBackupKind,
  systemExportKind = 'ttdash-system-export',
  appVersion = '0.0.0',
  isDarwin = processObject.platform === 'darwin',
  isWindows,
  secureDirMode,
  secureFileMode,
  fileMutationLockTimeoutMs,
  fileMutationLockStaleMs,
  fileMutationLockInstanceMismatchStaleMs = fileMutationLockTimeoutMs,
  debugLog = console.debug,
  getCliAutoLoadActive = () => false,
}) {
  const appPaths = resolveDataRuntimeAppPaths({
    os,
    path,
    processObject,
    appDirName,
    appDirNameLinux,
    isDarwin,
    isWindows,
  });
  const dataFile = path.join(appPaths.dataDir, 'data.json');
  const settingsFile = path.join(appPaths.configDir, 'settings.json');
  const npxCacheDir = path.join(appPaths.cacheDir, 'npx-cache');
  const systemsDir = path.join(appPaths.dataDir, 'systems');
  const fileIo = createDataRuntimeFileIo({
    fs,
    fsPromises,
    path,
    processObject,
    appPaths,
    npxCacheDir,
    isWindows,
    secureDirMode,
    secureFileMode,
  });
  const fileLocks = createDataRuntimeFileLocks({
    fsPromises,
    path,
    processObject,
    runtimeInstanceId,
    isWindows,
    secureDirMode,
    secureFileMode,
    fileMutationLockTimeoutMs,
    fileMutationLockStaleMs,
    fileMutationLockInstanceMismatchStaleMs,
    settingsFile,
    dataFile,
    debugLog,
  });
  const importMerge = createDataRuntimeImportMerge({
    normalizeIncomingData,
    settingsBackupKind,
    usageBackupKind,
  });
  const {
    ensureDir,
    ensureAppDirs,
    applySecureFileMode,
    isMissingFileError,
    writeJsonAtomic,
    writeJsonAtomicAsync,
    unlinkIfExists,
  } = fileIo;
  const {
    getFileMutationLockDir,
    withFileMutationLock,
    withOrderedFileMutationLocks,
    withSettingsAndDataMutationLock,
    getPendingFileMutationLockCount,
  } = fileLocks;
  const systemData = createSystemDataRuntime({
    fs,
    fsPromises,
    os,
    path,
    processObject,
    normalizeIncomingData,
    systemsDir,
    systemExportKind,
    appVersion,
    writeJsonAtomicAsync,
    withFileMutationLock,
  });
  const { extractSettingsImportPayload, extractUsageImportPayload, mergeUsageData } = importMerge;
  const normalizeIsoTimestamp = normalizeSharedIsoTimestamp;
  const normalizeProviderLimits = normalizeSharedProviderLimits;
  const normalizeSettings = normalizePersistedAppSettings;

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

  function toSettingsResponse(settings) {
    return {
      ...normalizeSettings(settings),
      cliAutoLoadActive: getCliAutoLoadActive(),
    };
  }

  function readData() {
    const file = readJsonFile(dataFile, 'usage');
    if (file.status === 'missing') {
      return null;
    }

    try {
      return normalizeIncomingData(file.value);
    } catch (error) {
      throw createPersistedStateError('usage', dataFile, error);
    }
  }

  function readUsageResponse(selectedSystemIds) {
    const localData = readData();
    const { systems: importedSystems, unreadableFiles } = systemData.readImportedSystems();
    const systems = [
      ...(localData
        ? [
            {
              id: systemData.localHostname,
              hostname: systemData.localHostname,
              filename: systemData.getSystemFilename(systemData.localHostname),
              isLocal: true,
              exportedAt: null,
              data: localData,
            },
          ]
        : []),
      ...importedSystems,
    ];
    // Empty or omitted selections mean "all systems". A non-empty selection is
    // explicit, so unknown IDs intentionally produce an empty aggregate.
    const selection = Array.isArray(selectedSystemIds)
      ? new Set(selectedSystemIds.map((value) => String(value).toLowerCase()))
      : null;
    const selectedSystems = selection?.size
      ? systems.filter((system) => selection.has(system.id))
      : systems;

    return {
      ...mergeUsageDatasets(selectedSystems.map((system) => system.data)),
      systems,
      unreadableSystemFiles: unreadableFiles,
    };
  }

  async function writeData(data) {
    await writeJsonAtomicAsync(dataFile, data);
  }

  function readSettings() {
    const file = readJsonFile(settingsFile, 'settings');
    if (file.status === 'missing') {
      return toSettingsResponse(createDefaultPersistedAppSettings());
    }

    return toSettingsResponse(file.value);
  }

  function readSettingsForWrite() {
    try {
      return readSettings();
    } catch (error) {
      if (isPersistedStateError(error, 'settings')) {
        return toSettingsResponse(createDefaultPersistedAppSettings());
      }

      throw error;
    }
  }

  async function writeSettings(settings) {
    await writeJsonAtomicAsync(settingsFile, normalizeSettings(settings));
  }

  async function _updateDataLoadStateUnlocked(patch) {
    const current = readSettingsForWrite();
    const next = {
      ...current,
      ...patch,
    };

    await writeSettings(next);
    return toSettingsResponse(next);
  }

  async function updateDataLoadState(patch) {
    return withFileMutationLock(settingsFile, () => _updateDataLoadStateUnlocked(patch));
  }

  async function updateSettings(patch) {
    return withFileMutationLock(settingsFile, async () => {
      const current = readSettingsForWrite();
      const next = {
        ...current,
        ...(patch && typeof patch === 'object' ? patch : {}),
      };

      await writeSettings(next);
      return toSettingsResponse(next);
    });
  }

  async function removeDefaultSystemFilters(hostnames = null) {
    return withFileMutationLock(settingsFile, async () => {
      const current = readSettingsForWrite();
      const removed = hostnames ? new Set(hostnames) : null;
      const next = {
        ...current,
        defaultFilters: {
          ...current.defaultFilters,
          systems: removed
            ? current.defaultFilters.systems.filter((hostname) => !removed.has(hostname))
            : [],
        },
      };

      await writeSettings(next);
      return toSettingsResponse(next);
    });
  }

  function migrateLegacyDataFile(log = console.log) {
    if (!fs.existsSync(legacyDataFile) || fs.existsSync(dataFile)) {
      return;
    }

    ensureDir(path.dirname(dataFile));

    try {
      fs.renameSync(legacyDataFile, dataFile);
      applySecureFileMode(dataFile);
      log(`Migrating existing data to ${dataFile}`);
    } catch (renameError) {
      if (isMissingFileError(renameError) && fs.existsSync(dataFile)) {
        applySecureFileMode(dataFile);
        log(`Existing data already migrated to ${dataFile}`);
        return;
      }

      try {
        fs.copyFileSync(legacyDataFile, dataFile);
      } catch (copyError) {
        if (isMissingFileError(copyError) && fs.existsSync(dataFile)) {
          applySecureFileMode(dataFile);
          log(`Existing data already migrated to ${dataFile}`);
          return;
        }
        throw copyError;
      }
      applySecureFileMode(dataFile);
      try {
        fs.unlinkSync(legacyDataFile);
      } catch {
        // Ignore best-effort cleanup failures after copying legacy data.
      }
      log(`Copying existing data to ${dataFile}`);
    }
  }

  return {
    appPaths,
    normalizeIncomingData,
    paths: {
      appPaths,
      dataFile,
      settingsFile,
      npxCacheDir,
      systemsDir,
    },
    ensureDir,
    ensureAppDirs: (extraDirs = []) => ensureAppDirs([systemsDir, ...extraDirs]),
    writeJsonAtomic,
    writeJsonAtomicAsync,
    unlinkIfExists,
    getFileMutationLockDir,
    withFileMutationLock,
    withOrderedFileMutationLocks,
    withSettingsAndDataMutationLock,
    getPendingFileMutationLockCount,
    migrateLegacyDataFile,
    normalizeIsoTimestamp,
    normalizeProviderLimits,
    normalizeSettings,
    createPersistedStateError,
    isPersistedStateError,
    isPayloadTooLargeError,
    extractSettingsImportPayload,
    extractUsageImportPayload,
    mergeUsageData,
    readData,
    readUsageResponse,
    writeData,
    readSettings,
    readSettingsForWrite,
    writeSettings,
    _updateDataLoadStateUnlocked,
    updateDataLoadState,
    updateSettings,
    removeDefaultSystemFilters,
    systemData,
  };
}

module.exports = {
  createDataRuntime,
};
