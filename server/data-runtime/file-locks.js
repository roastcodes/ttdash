/** Creates in-process and cross-process file mutation locks for data runtime writes. */
function getInvalidFileLockOptionNames({
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
}) {
  const invalidOptions = [];

  if (!fsPromises) invalidOptions.push('fsPromises');
  if (!path) invalidOptions.push('path');
  if (!processObject) invalidOptions.push('processObject');
  if (typeof runtimeInstanceId !== 'string' || !runtimeInstanceId) {
    invalidOptions.push('runtimeInstanceId');
  }
  if (typeof isWindows !== 'boolean') invalidOptions.push('isWindows');
  if (
    secureDirMode != null &&
    (!Number.isInteger(secureDirMode) || secureDirMode < 0 || secureDirMode > 0o777)
  ) {
    invalidOptions.push('secureDirMode');
  }
  if (
    secureFileMode != null &&
    (!Number.isInteger(secureFileMode) || secureFileMode < 0 || secureFileMode > 0o777)
  ) {
    invalidOptions.push('secureFileMode');
  }
  if (
    typeof fileMutationLockTimeoutMs !== 'number' ||
    !Number.isFinite(fileMutationLockTimeoutMs) ||
    fileMutationLockTimeoutMs < 0
  ) {
    invalidOptions.push('fileMutationLockTimeoutMs');
  }
  if (
    typeof fileMutationLockStaleMs !== 'number' ||
    !Number.isFinite(fileMutationLockStaleMs) ||
    fileMutationLockStaleMs < 0
  ) {
    invalidOptions.push('fileMutationLockStaleMs');
  }
  if (
    typeof fileMutationLockInstanceMismatchStaleMs !== 'number' ||
    !Number.isFinite(fileMutationLockInstanceMismatchStaleMs) ||
    fileMutationLockInstanceMismatchStaleMs < 0
  ) {
    invalidOptions.push('fileMutationLockInstanceMismatchStaleMs');
  }
  if (typeof settingsFile !== 'string' || !settingsFile) invalidOptions.push('settingsFile');
  if (typeof dataFile !== 'string' || !dataFile) invalidOptions.push('dataFile');
  if (typeof debugLog !== 'function') invalidOptions.push('debugLog');

  return invalidOptions;
}

function createDataRuntimeFileLocks({
  fsPromises,
  path,
  processObject,
  runtimeInstanceId,
  isWindows,
  secureDirMode,
  secureFileMode,
  fileMutationLockTimeoutMs,
  fileMutationLockStaleMs,
  fileMutationLockInstanceMismatchStaleMs = fileMutationLockTimeoutMs,
  settingsFile,
  dataFile,
  debugLog = console.debug,
}) {
  const invalidOptions = getInvalidFileLockOptionNames({
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

  if (invalidOptions.length > 0) {
    throw new TypeError(
      `createDataRuntimeFileLocks received invalid options: ${invalidOptions.join(', ')}`,
    );
  }

  const fileMutationLocks = new Map();

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
        debugLog('Failed to read file mutation lock owner', { ownerPath, error });
        // Continue through the stale-lock fallback chain: owner fields first, age last.
      }
    }

    try {
      const ownerCreatedAt = owner?.createdAt ? Date.parse(owner.createdAt) : Number.NaN;
      if (
        typeof owner?.instanceId === 'string' &&
        owner.instanceId !== runtimeInstanceId &&
        Number.isFinite(ownerCreatedAt) &&
        Date.now() - ownerCreatedAt > fileMutationLockInstanceMismatchStaleMs
      ) {
        return true;
      }

      if (Number.isInteger(owner?.pid)) {
        return !isProcessRunning(owner.pid);
      }

      const stats = await fsPromises.stat(lockDir);
      const lockAgeMs = Number.isFinite(ownerCreatedAt)
        ? Date.now() - ownerCreatedAt
        : Date.now() - stats.mtimeMs;

      if (lockAgeMs > fileMutationLockStaleMs) {
        return true;
      }

      return false;
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  function createFileMutationLockQueueTimeoutError(filePath) {
    return new Error(
      `Timed out waiting for previous file mutation lock for ${path.basename(filePath)}.`,
    );
  }

  async function waitForPreviousFileMutationLock(previous, filePath) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(createFileMutationLockQueueTimeoutError(filePath));
      }, fileMutationLockTimeoutMs);
    });

    try {
      await Promise.race([previous.catch(() => undefined), timeout]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function withCrossProcessFileMutationLock(
    filePath,
    operation,
    timeoutMs = fileMutationLockTimeoutMs,
  ) {
    const lockDir = getFileMutationLockDir(filePath);
    const startedAt = Date.now();
    let backoffMs = 50;
    const maxBackoffMs = 1600;

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
          try {
            await removeFileMutationLockDir(lockDir);
          } catch (cleanupError) {
            debugLog('Failed to remove mutation lock dir', { lockDir, error: cleanupError });
          }
          throw error;
        }

        break;
      } catch (error) {
        if (!error || error.code !== 'EEXIST') {
          throw error;
        }

        if (await shouldReapFileMutationLock(lockDir)) {
          await removeFileMutationLockDir(lockDir).catch(() => undefined);
          backoffMs = 50;
          continue;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          throw new Error(`Could not acquire file mutation lock for ${path.basename(filePath)}.`, {
            cause: error,
          });
        }

        await sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
      }
    }

    try {
      return await operation();
    } finally {
      try {
        await removeFileMutationLockDir(lockDir);
      } catch (error) {
        debugLog('failed cleaning lockDir', error);
        // Ignore cleanup races so the original operation result wins.
      }
    }
  }

  async function withFileMutationLock(filePath, operation) {
    const previous = fileMutationLocks.get(filePath) || Promise.resolve();
    let releaseCurrent = () => {};
    const current = new Promise((resolve) => {
      releaseCurrent = resolve;
    });

    fileMutationLocks.set(filePath, current);

    try {
      await waitForPreviousFileMutationLock(previous, filePath);
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

  return {
    getFileMutationLockDir,
    withFileMutationLock,
    withOrderedFileMutationLocks,
    withSettingsAndDataMutationLock,
    getPendingFileMutationLockCount: () => fileMutationLocks.size,
  };
}

module.exports = {
  createDataRuntimeFileLocks,
};
