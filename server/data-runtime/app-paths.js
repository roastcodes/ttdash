/** Resolves platform-specific data, config, and cache directories for the local app runtime. */
function resolveDataRuntimeAppPaths({
  os,
  path,
  processObject,
  appDirName,
  appDirNameLinux,
  isDarwin,
  isWindows,
}) {
  const env = processObject.env || {};
  const osHomeDir = os.homedir();
  const homeDir =
    typeof osHomeDir === 'string' && osHomeDir ? osHomeDir : env.HOME || env.USERPROFILE || '.';
  const runningOnDarwin = isDarwin === true;
  const runningOnWindows = isWindows === true;
  const explicitPaths = {
    dataDir: env.TTDASH_DATA_DIR,
    configDir: env.TTDASH_CONFIG_DIR,
    cacheDir: env.TTDASH_CACHE_DIR,
  };
  let platformPaths;

  if (runningOnDarwin) {
    const appSupportDir = path.join(homeDir, 'Library', 'Application Support', appDirName);
    platformPaths = {
      dataDir: appSupportDir,
      configDir: appSupportDir,
      cacheDir: path.join(homeDir, 'Library', 'Caches', appDirName),
    };
  } else if (runningOnWindows) {
    platformPaths = {
      dataDir: path.join(env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'), appDirName),
      configDir: path.join(env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), appDirName),
      cacheDir: path.join(
        env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'),
        appDirName,
        'Cache',
      ),
    };
  } else {
    platformPaths = {
      dataDir: path.join(
        env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share'),
        appDirNameLinux,
      ),
      configDir: path.join(env.XDG_CONFIG_HOME || path.join(homeDir, '.config'), appDirNameLinux),
      cacheDir: path.join(env.XDG_CACHE_HOME || path.join(homeDir, '.cache'), appDirNameLinux),
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
