/** Resolves platform-specific data, config, and cache directories for the local app runtime. */
function resolveDataRuntimeAppPaths({
  os,
  path,
  processObject,
  appDirName,
  appDirNameLinux,
  isWindows,
}) {
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

module.exports = {
  resolveDataRuntimeAppPaths,
};
