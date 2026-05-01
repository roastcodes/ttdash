/** Creates secure JSON file I/O helpers for the data runtime. */
function createDataRuntimeFileIo({
  fs,
  fsPromises,
  path,
  processObject,
  appPaths,
  npxCacheDir,
  isWindows,
  secureDirMode,
  secureFileMode,
}) {
  function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true, mode: secureDirMode });
    if (!isWindows) {
      fs.chmodSync(dirPath, secureDirMode);
    }
  }

  async function ensureDirAsync(dirPath) {
    await fsPromises.mkdir(dirPath, { recursive: true, mode: secureDirMode });
    if (!isWindows) {
      await fsPromises.chmod(dirPath, secureDirMode);
    }
  }

  function ensureAppDirs(extraDirs = []) {
    ensureDir(appPaths.dataDir);
    ensureDir(appPaths.configDir);
    ensureDir(appPaths.cacheDir);
    ensureDir(npxCacheDir);
    extraDirs.forEach((dirPath) => ensureDir(dirPath));
  }

  function applySecureFileMode(filePath) {
    if (!isWindows) {
      fs.chmodSync(filePath, secureFileMode);
    }
  }

  function isMissingFileError(error) {
    return error?.code === 'ENOENT';
  }

  function writeJsonAtomic(filePath, data) {
    ensureDir(path.dirname(filePath));
    const tempPath = `${filePath}.${processObject.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), {
        mode: secureFileMode,
      });
      applySecureFileMode(tempPath);
      fs.renameSync(tempPath, filePath);
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

  async function writeJsonAtomicAsync(filePath, data) {
    const tempPath = `${filePath}.${processObject.pid}.${Date.now()}.tmp`;
    const parentDir = path.dirname(filePath);

    try {
      await ensureDirAsync(parentDir);
      await fsPromises.writeFile(tempPath, JSON.stringify(data, null, 2), {
        mode: secureFileMode,
      });

      if (!isWindows) {
        await fsPromises.chmod(tempPath, secureFileMode);
      }

      await fsPromises.rename(tempPath, filePath);
    } catch (error) {
      try {
        await fsPromises.unlink(tempPath);
      } catch (unlinkError) {
        if (unlinkError?.code !== 'ENOENT') {
          throw new AggregateError(
            [error, unlinkError],
            `Failed atomic JSON write and temp-file cleanup for ${path.basename(filePath)}.`,
          );
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

  return {
    ensureDir,
    ensureAppDirs,
    applySecureFileMode,
    isMissingFileError,
    writeJsonAtomic,
    writeJsonAtomicAsync,
    unlinkIfExists,
  };
}

module.exports = {
  createDataRuntimeFileIo,
};
