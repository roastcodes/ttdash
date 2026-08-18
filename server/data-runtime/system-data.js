const SYSTEM_FILENAME_PREFIX = 'ttdash-system-';
const SYSTEM_FILENAME_SUFFIX = '.json';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const REQUIRED_USAGE_TOTAL_KEYS = [
  'inputTokens',
  'outputTokens',
  'cacheCreationTokens',
  'cacheReadTokens',
  'thinkingTokens',
  'totalCost',
  'totalTokens',
  'requestCount',
];

function isUsageData(value) {
  return (
    isPlainObject(value) &&
    Array.isArray(value.daily) &&
    value.daily.every((day) => isPlainObject(day) && typeof day.date === 'string') &&
    isPlainObject(value.totals) &&
    REQUIRED_USAGE_TOTAL_KEYS.every((key) => Number.isFinite(value.totals[key]))
  );
}

function canonicalizeHostname(value) {
  if (typeof value !== 'string') {
    throw new Error('System export hostname is missing.');
  }

  const hostname = value.trim().toLowerCase();
  if (!hostname || hostname.length > 253 || !/^[a-z0-9._-]+$/.test(hostname)) {
    throw new Error('System export hostname is invalid.');
  }
  return hostname;
}

function hostnameSlug(hostname) {
  const slug = canonicalizeHostname(hostname)
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|[._-]+$/g, '');
  if (!slug) {
    throw new Error('System export hostname cannot be used in a filename.');
  }
  return slug;
}

function getSystemFilename(hostname) {
  return `${SYSTEM_FILENAME_PREFIX}${hostnameSlug(hostname)}${SYSTEM_FILENAME_SUFFIX}`;
}

function computeTotals(daily) {
  return daily.reduce(
    (totals, day) => ({
      inputTokens: totals.inputTokens + day.inputTokens,
      outputTokens: totals.outputTokens + day.outputTokens,
      cacheCreationTokens: totals.cacheCreationTokens + day.cacheCreationTokens,
      cacheReadTokens: totals.cacheReadTokens + day.cacheReadTokens,
      thinkingTokens: totals.thinkingTokens + day.thinkingTokens,
      totalCost: totals.totalCost + day.totalCost,
      totalTokens: totals.totalTokens + day.totalTokens,
      requestCount: totals.requestCount + day.requestCount,
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

function mergeBreakdown(target, source) {
  target.inputTokens += source.inputTokens;
  target.outputTokens += source.outputTokens;
  target.cacheCreationTokens += source.cacheCreationTokens;
  target.cacheReadTokens += source.cacheReadTokens;
  target.thinkingTokens += source.thinkingTokens;
  target.cost += source.cost;
  target.requestCount += source.requestCount;
}

function mergeUsageDatasets(datasets) {
  const days = new Map();

  for (const dataset of datasets) {
    for (const sourceDay of dataset?.daily || []) {
      let targetDay = days.get(sourceDay.date);
      if (!targetDay) {
        targetDay = {
          date: sourceDay.date,
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
          modelsUsed: [],
          modelBreakdowns: [],
        };
        Object.defineProperty(targetDay, '_breakdowns', {
          value: new Map(),
          enumerable: false,
        });
        days.set(sourceDay.date, targetDay);
      }

      targetDay.inputTokens += sourceDay.inputTokens;
      targetDay.outputTokens += sourceDay.outputTokens;
      targetDay.cacheCreationTokens += sourceDay.cacheCreationTokens;
      targetDay.cacheReadTokens += sourceDay.cacheReadTokens;
      targetDay.thinkingTokens += sourceDay.thinkingTokens;
      targetDay.totalTokens += sourceDay.totalTokens;
      targetDay.totalCost += sourceDay.totalCost;
      targetDay.requestCount += sourceDay.requestCount;

      for (const sourceBreakdown of Array.isArray(sourceDay.modelBreakdowns)
        ? sourceDay.modelBreakdowns
        : []) {
        let targetBreakdown = targetDay._breakdowns.get(sourceBreakdown.modelName);
        if (!targetBreakdown) {
          targetBreakdown = {
            modelName: sourceBreakdown.modelName,
            inputTokens: 0,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
            thinkingTokens: 0,
            cost: 0,
            requestCount: 0,
          };
          targetDay._breakdowns.set(sourceBreakdown.modelName, targetBreakdown);
          targetDay.modelBreakdowns.push(targetBreakdown);
        }
        mergeBreakdown(targetBreakdown, sourceBreakdown);
      }
      targetDay.modelsUsed = Array.from(
        new Set([
          ...targetDay.modelsUsed,
          ...(Array.isArray(sourceDay.modelsUsed) ? sourceDay.modelsUsed : []),
          ...targetDay._breakdowns.keys(),
        ]),
      );
    }
  }

  const daily = Array.from(days.values()).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  return { daily, totals: computeTotals(daily) };
}

/** Creates the persistence helpers for imported per-system usage exports. */
function createSystemDataRuntime({
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
}) {
  const localHostname = canonicalizeHostname(
    typeof os.hostname === 'function' ? os.hostname() : 'localhost',
  );

  function createEnvelope(data) {
    return {
      kind: systemExportKind,
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion,
      hostname: localHostname,
      data,
    };
  }

  function parseEnvelope(payload) {
    if (!isPlainObject(payload) || payload.kind !== systemExportKind || payload.version !== 1) {
      throw new Error('Uploaded JSON is not a TTDash system export.');
    }
    const hostname = canonicalizeHostname(payload.hostname);
    if (!Object.prototype.hasOwnProperty.call(payload, 'data')) {
      throw new Error('The system export does not contain usage data.');
    }
    let data;
    try {
      data = normalizeIncomingData(payload.data);
    } catch (error) {
      throw new Error('Invalid system export file.', { cause: error });
    }
    if (!isUsageData(data)) {
      throw new Error('Invalid system export file.');
    }
    return {
      kind: systemExportKind,
      version: 1,
      exportedAt:
        typeof payload.exportedAt === 'string' && Number.isFinite(Date.parse(payload.exportedAt))
          ? new Date(payload.exportedAt).toISOString()
          : new Date().toISOString(),
      appVersion: typeof payload.appVersion === 'string' ? payload.appVersion : 'unknown',
      hostname,
      data,
    };
  }

  function resolveSystemFile(hostname) {
    return path.join(systemsDir, getSystemFilename(hostname));
  }

  function readImportedSystems() {
    let names;
    try {
      names = fs.readdirSync(systemsDir);
    } catch (error) {
      if (error?.code === 'ENOENT') return { systems: [], unreadableFiles: [] };
      throw error;
    }

    const systems = [];
    const unreadableFiles = [];
    for (const name of names.filter(
      (entry) => entry.startsWith(SYSTEM_FILENAME_PREFIX) && entry.endsWith(SYSTEM_FILENAME_SUFFIX),
    )) {
      const filePath = path.join(systemsDir, name);
      let envelope;
      try {
        envelope = parseEnvelope(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
        if (name !== getSystemFilename(envelope.hostname)) {
          throw new Error('Imported system filename does not match its hostname.');
        }
      } catch (error) {
        const persistedError = new Error(
          `Imported system file ${name} is unreadable or corrupted.`,
        );
        persistedError.code = 'PERSISTED_STATE_INVALID';
        persistedError.kind = 'usage';
        persistedError.filePath = filePath;
        persistedError.cause = error;
        unreadableFiles.push({ filename: name, message: persistedError.message });
        continue;
      }
      systems.push({
        id: envelope.hostname,
        hostname: envelope.hostname,
        filename: name,
        isLocal: false,
        exportedAt: envelope.exportedAt,
        data: envelope.data,
      });
    }
    systems.sort((left, right) => left.hostname.localeCompare(right.hostname));
    unreadableFiles.sort((left, right) => left.filename.localeCompare(right.filename));
    return { systems, unreadableFiles };
  }

  function previewImport(payload) {
    const envelope = parseEnvelope(payload);
    if (envelope.hostname === localHostname) {
      const error = new Error('A system export from this hostname cannot replace local data.');
      error.code = 'LOCAL_SYSTEM_CONFLICT';
      throw error;
    }
    return {
      hostname: envelope.hostname,
      filename: getSystemFilename(envelope.hostname),
      exists: fs.existsSync(resolveSystemFile(envelope.hostname)),
    };
  }

  async function importSystem(payload, { replace = false } = {}) {
    const envelope = parseEnvelope(payload);
    if (envelope.hostname === localHostname) {
      const error = new Error('A system export from this hostname cannot replace local data.');
      error.code = 'LOCAL_SYSTEM_CONFLICT';
      throw error;
    }
    const filePath = resolveSystemFile(envelope.hostname);
    return withSystemMutationLock(() =>
      withFileMutationLock(filePath, async () => {
        const exists = fs.existsSync(filePath);
        if (exists && !replace) {
          const error = new Error(`System ${envelope.hostname} already exists.`);
          error.code = 'SYSTEM_EXISTS';
          throw error;
        }
        await writeJsonAtomicAsync(filePath, envelope);
        return {
          hostname: envelope.hostname,
          filename: path.basename(filePath),
          replaced: exists,
          days: envelope.data.daily.length,
          totalCost: envelope.data.totals.totalCost,
        };
      }),
    );
  }

  async function deleteImportedSystem(hostname) {
    const normalized = canonicalizeHostname(hostname);
    const filePath = resolveSystemFile(normalized);
    return withSystemMutationLock(() =>
      withFileMutationLock(filePath, async () => {
        try {
          await fsPromises.unlink(filePath);
          return true;
        } catch (error) {
          if (error?.code === 'ENOENT') return false;
          throw error;
        }
      }),
    );
  }

  function withSystemMutationLock(operation) {
    return withFileMutationLock(systemsDir, operation);
  }

  async function deleteAllImportedSystems({ mutationLockHeld = false } = {}) {
    const deleteFiles = async () => {
      let names;
      try {
        names = (await fsPromises.readdir(systemsDir)).filter(
          (name) =>
            name.startsWith(SYSTEM_FILENAME_PREFIX) && name.endsWith(SYSTEM_FILENAME_SUFFIX),
        );
      } catch (error) {
        if (error?.code === 'ENOENT') return 0;
        throw error;
      }

      for (const name of names) {
        const filePath = path.join(systemsDir, name);
        await withFileMutationLock(filePath, async () => {
          try {
            await fsPromises.unlink(filePath);
          } catch (error) {
            if (error?.code !== 'ENOENT') throw error;
          }
        });
      }
      try {
        await fsPromises.rmdir(systemsDir);
      } catch (error) {
        if (!['ENOENT', 'ENOTEMPTY'].includes(error?.code)) throw error;
      }
      return names.length;
    };
    return mutationLockHeld ? deleteFiles() : withSystemMutationLock(deleteFiles);
  }

  function resolveExportPath(targetPath) {
    const env = processObject.env || {};
    const home = os.homedir();
    const downloadsDir =
      typeof env.XDG_DOWNLOAD_DIR === 'string' && path.isAbsolute(env.XDG_DOWNLOAD_DIR)
        ? env.XDG_DOWNLOAD_DIR
        : path.join(home, 'Downloads');
    const filename = getSystemFilename(localHostname);
    if (!targetPath) return path.join(downloadsDir, filename);

    const workingDirectory =
      typeof processObject.cwd === 'function' ? processObject.cwd() : process.cwd();
    const resolved = path.resolve(workingDirectory, targetPath);
    let isDirectory = path.extname(resolved).toLowerCase() !== '.json';
    try {
      isDirectory = fs.statSync(resolved).isDirectory();
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    return isDirectory ? path.join(resolved, filename) : resolved;
  }

  async function exportLocalData(data, targetPath) {
    if (!data?.daily?.length) {
      throw new Error('No local data available for system export.');
    }
    const filePath = resolveExportPath(targetPath);
    await writeJsonAtomicAsync(filePath, createEnvelope(data));
    return filePath;
  }

  return {
    localHostname,
    systemsDir,
    createEnvelope,
    getSystemFilename,
    parseEnvelope,
    previewImport,
    importSystem,
    deleteImportedSystem,
    deleteAllImportedSystems,
    withSystemMutationLock,
    readImportedSystems,
    resolveExportPath,
    exportLocalData,
  };
}

module.exports = {
  canonicalizeHostname,
  createSystemDataRuntime,
  getSystemFilename,
  mergeUsageDatasets,
};
