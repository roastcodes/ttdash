function createDataRuntime({
  fs,
  fsPromises,
  os,
  path,
  processObject = process,
  normalizeIncomingData,
  dashboardDatePresets,
  dashboardSectionIds,
  defaultSettings,
  runtimeInstanceId,
  appDirName,
  appDirNameLinux,
  legacyDataFile,
  settingsBackupKind,
  usageBackupKind,
  isWindows,
  secureDirMode,
  secureFileMode,
  fileMutationLockTimeoutMs,
  fileMutationLockStaleMs,
  getCliAutoLoadActive = () => false,
}) {
  function resolveAppPaths() {
    const homeDir = os.homedir();
    const explicitPaths = {
      dataDir: processObject.env.TTDASH_DATA_DIR,
      configDir: processObject.env.TTDASH_CONFIG_DIR,
      cacheDir: processObject.env.TTDASH_CACHE_DIR,
    };
    let platformPaths;

    if (processObject.platform === 'darwin') {
      const appSupportDir = path.join(homeDir, 'Library', 'Application Support', appDirName);
      platformPaths = {
        dataDir: appSupportDir,
        configDir: appSupportDir,
        cacheDir: path.join(homeDir, 'Library', 'Caches', appDirName),
      };
    } else if (isWindows) {
      platformPaths = {
        dataDir: path.join(
          processObject.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'),
          appDirName,
        ),
        configDir: path.join(
          processObject.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'),
          appDirName,
        ),
        cacheDir: path.join(
          processObject.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'),
          appDirName,
          'Cache',
        ),
      };
    } else {
      platformPaths = {
        dataDir: path.join(
          processObject.env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share'),
          appDirNameLinux,
        ),
        configDir: path.join(
          processObject.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'),
          appDirNameLinux,
        ),
        cacheDir: path.join(
          processObject.env.XDG_CACHE_HOME || path.join(homeDir, '.cache'),
          appDirNameLinux,
        ),
      };
    }

    return {
      dataDir: explicitPaths.dataDir || platformPaths.dataDir,
      configDir: explicitPaths.configDir || platformPaths.configDir,
      cacheDir: explicitPaths.cacheDir || platformPaths.cacheDir,
    };
  }

  const appPaths = resolveAppPaths();
  const dataFile = path.join(appPaths.dataDir, 'data.json');
  const settingsFile = path.join(appPaths.configDir, 'settings.json');
  const npxCacheDir = path.join(appPaths.cacheDir, 'npx-cache');
  const fileMutationLocks = new Map();

  function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true, mode: secureDirMode });
    if (!isWindows) {
      fs.chmodSync(dirPath, secureDirMode);
    }
  }

  function ensureAppDirs(extraDirs = []) {
    ensureDir(appPaths.dataDir);
    ensureDir(appPaths.configDir);
    ensureDir(appPaths.cacheDir);
    ensureDir(npxCacheDir);
    extraDirs.forEach((dirPath) => ensureDir(dirPath));
  }

  function writeJsonAtomic(filePath, data) {
    ensureDir(path.dirname(filePath));
    const tempPath = `${filePath}.${processObject.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), {
      mode: secureFileMode,
    });
    if (!isWindows) {
      fs.chmodSync(tempPath, secureFileMode);
    }
    fs.renameSync(tempPath, filePath);
  }

  async function writeJsonAtomicAsync(filePath, data) {
    const tempPath = `${filePath}.${processObject.pid}.${Date.now()}.tmp`;
    let tempPathCreated = false;

    try {
      await fsPromises.mkdir(path.dirname(filePath), { recursive: true, mode: secureDirMode });
      tempPathCreated = true;
      await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2), {
        mode: secureFileMode,
      });

      if (!isWindows) {
        await fsPromises.chmod(tempPath, secureFileMode);
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
      pid: processObject.pid,
      createdAt: new Date().toISOString(),
      instanceId: runtimeInstanceId,
    };
    await fsPromises.writeFile(ownerPath, JSON.stringify(owner, null, 2), {
      mode: secureFileMode,
    });
    if (!isWindows) {
      await fsPromises.chmod(ownerPath, secureFileMode);
    }
  }

  function isProcessRunning(pid) {
    if (!Number.isInteger(pid) || pid <= 0) {
      return false;
    }

    try {
      processObject.kill(pid, 0);
      return true;
    } catch (error) {
      return error && error.code === 'EPERM';
    }
  }

  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function shouldReapFileMutationLock(lockDir) {
    const ownerPath = getFileMutationLockOwnerPath(lockDir);
    let owner = null;

    try {
      const rawOwner = await fsPromises.readFile(ownerPath, 'utf-8');
      owner = JSON.parse(rawOwner);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        // Fall back to age-based cleanup if the owner metadata is missing or malformed.
      }
    }

    try {
      const ownerCreatedAt = owner?.createdAt ? Date.parse(owner.createdAt) : Number.NaN;
      const stats = await fsPromises.stat(lockDir);
      const lockAgeMs = Number.isFinite(ownerCreatedAt)
        ? Date.now() - ownerCreatedAt
        : Date.now() - stats.mtimeMs;

      if (lockAgeMs > fileMutationLockStaleMs) {
        return true;
      }

      if (Number.isInteger(owner?.pid)) {
        return !isProcessRunning(owner.pid);
      }

      return false;
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
    timeoutMs = fileMutationLockTimeoutMs,
  ) {
    const lockDir = getFileMutationLockDir(filePath);
    const startedAt = Date.now();

    while (true) {
      try {
        await fsPromises.mkdir(path.dirname(lockDir), {
          recursive: true,
          mode: secureDirMode,
        });
        await fsPromises.mkdir(lockDir, { mode: secureDirMode });
        if (!isWindows) {
          await fsPromises.chmod(lockDir, secureDirMode);
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
    return withOrderedFileMutationLocks([settingsFile, dataFile], operation);
  }

  function normalizeLanguage(value) {
    return value === 'en' ? 'en' : 'de';
  }

  function normalizeTheme(value) {
    return value === 'light' ? 'light' : 'dark';
  }

  function normalizeReducedMotionPreference(value) {
    return value === 'always' || value === 'never' ? value : 'system';
  }

  function normalizeViewMode(value) {
    return value === 'monthly' || value === 'yearly' ? value : 'daily';
  }

  function normalizeDashboardDatePreset(value) {
    return dashboardDatePresets.includes(value) ? value : 'all';
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
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Number(value.toFixed(2)));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
    return (
      JSON.stringify(canonicalizeUsageDay(left)) === JSON.stringify(canonicalizeUsageDay(right))
    );
  }

  function extractSettingsImportPayload(payload) {
    if (!isPlainObject(payload)) {
      throw new Error('Uploaded JSON is not a settings backup file.');
    }

    if (payload.kind === settingsBackupKind) {
      if (!Object.prototype.hasOwnProperty.call(payload, 'settings')) {
        throw new Error('The settings backup file does not contain any settings.');
      }
      if (!isPlainObject(payload.settings)) {
        throw new Error('The settings backup file has an invalid settings payload.');
      }
      return payload.settings;
    }

    if (typeof payload.kind === 'string' && payload.kind === usageBackupKind) {
      throw new Error('This is a data backup file, not a settings file.');
    }

    throw new Error('Uploaded JSON is not a settings backup file.');
  }

  function extractUsageImportPayload(payload) {
    if (!isPlainObject(payload)) {
      return payload;
    }

    if (payload.kind === usageBackupKind) {
      if (!Object.prototype.hasOwnProperty.call(payload, 'data')) {
        throw new Error('The usage backup file does not contain any usage data.');
      }
      return payload.data;
    }

    if (typeof payload.kind === 'string' && payload.kind === settingsBackupKind) {
      throw new Error('This is a settings backup file, not a data file.');
    }

    return payload;
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

    for (const sectionId of dashboardSectionIds) {
      next[sectionId] = typeof source[sectionId] === 'boolean' ? source[sectionId] : true;
    }

    return next;
  }

  function normalizeSectionOrder(value) {
    if (!Array.isArray(value)) {
      return [...dashboardSectionIds];
    }

    const incoming = value.filter(
      (sectionId) => typeof sectionId === 'string' && dashboardSectionIds.includes(sectionId),
    );
    const uniqueIncoming = [...new Set(incoming)];
    const missing = dashboardSectionIds.filter((sectionId) => !uniqueIncoming.includes(sectionId));

    return [...uniqueIncoming, ...missing];
  }

  function normalizeSettings(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      language: normalizeLanguage(source.language),
      theme: normalizeTheme(source.theme),
      reducedMotionPreference: normalizeReducedMotionPreference(source.reducedMotionPreference),
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

  async function writeData(data) {
    await writeJsonAtomicAsync(dataFile, data);
  }

  function readSettings() {
    const file = readJsonFile(settingsFile, 'settings');
    if (file.status === 'missing') {
      return toSettingsResponse({
        ...defaultSettings,
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
          ...defaultSettings,
          providerLimits: {},
        });
      }

      throw error;
    }
  }

  async function writeSettings(settings) {
    await writeJsonAtomicAsync(settingsFile, normalizeSettings(settings));
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
    return withFileMutationLock(settingsFile, async () => {
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
      next.reducedMotionPreference = normalizeReducedMotionPreference(next.reducedMotionPreference);

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
      log(`Migrating existing data to ${dataFile}`);
    } catch {
      fs.copyFileSync(legacyDataFile, dataFile);
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
    },
    ensureDir,
    ensureAppDirs,
    writeJsonAtomic,
    writeJsonAtomicAsync,
    unlinkIfExists,
    getFileMutationLockDir,
    withFileMutationLock,
    withOrderedFileMutationLocks,
    withSettingsAndDataMutationLock,
    getPendingFileMutationLockCount: () => fileMutationLocks.size,
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
    writeData,
    readSettings,
    readSettingsForWrite,
    writeSettings,
    updateDataLoadState,
    updateSettings,
  };
}

module.exports = {
  createDataRuntime,
};
