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
  const explicitPaths = {
    dataDir: env.TTDASH_DATA_DIR,
    configDir: env.TTDASH_CONFIG_DIR,
    cacheDir: env.TTDASH_CACHE_DIR,
  };
  const explicitPathEnvVars = {
    dataDir: 'TTDASH_DATA_DIR',
    configDir: 'TTDASH_CONFIG_DIR',
    cacheDir: 'TTDASH_CACHE_DIR',
  };
  const invalidExplicitPathEnvVars = Object.entries(explicitPaths)
    .filter(([key, value]) => {
      const envVar = explicitPathEnvVars[key];
      return (
        Object.prototype.hasOwnProperty.call(env, envVar) &&
        (typeof value !== 'string' || !path.isAbsolute(value))
      );
    })
    .map(([key]) => explicitPathEnvVars[key]);

  if (invalidExplicitPathEnvVars.length > 0) {
    throw new Error(
      `TTDash app path environment variables must be absolute paths: ${invalidExplicitPathEnvVars.join(', ')}.`,
    );
  }

  if (explicitPaths.dataDir && explicitPaths.configDir && explicitPaths.cacheDir) {
    return explicitPaths;
  }

  function resolveHomeDir() {
    // Do not fall back to "."; derived app paths must never point at the current working directory.
    const candidates = [os.homedir(), env.HOME, env.USERPROFILE];
    return candidates.find(
      (candidate) => typeof candidate === 'string' && candidate && path.isAbsolute(candidate),
    );
  }

  const homeDir = resolveHomeDir();
  function requireHomeDir() {
    if (homeDir) {
      return homeDir;
    }

    throw new Error('User home directory could not be determined for TTDash app paths.');
  }

  const runningOnDarwin = isDarwin === true;
  const runningOnWindows = isWindows === true;
  let platformPaths;

  if (runningOnDarwin) {
    const resolvedHomeDir = requireHomeDir();
    const appSupportDir = path.join(resolvedHomeDir, 'Library', 'Application Support', appDirName);
    platformPaths = {
      dataDir: appSupportDir,
      configDir: appSupportDir,
      cacheDir: path.join(resolvedHomeDir, 'Library', 'Caches', appDirName),
    };
  } else if (runningOnWindows) {
    const localAppDataDir = env.LOCALAPPDATA || path.join(requireHomeDir(), 'AppData', 'Local');
    platformPaths = {
      dataDir: path.join(localAppDataDir, appDirName),
      configDir: path.join(
        env.APPDATA || path.join(requireHomeDir(), 'AppData', 'Roaming'),
        appDirName,
      ),
      cacheDir: path.join(localAppDataDir, appDirName, 'Cache'),
    };
  } else {
    platformPaths = {
      dataDir: path.join(
        env.XDG_DATA_HOME || path.join(requireHomeDir(), '.local', 'share'),
        appDirNameLinux,
      ),
      configDir: path.join(
        env.XDG_CONFIG_HOME || path.join(requireHomeDir(), '.config'),
        appDirNameLinux,
      ),
      cacheDir: path.join(
        env.XDG_CACHE_HOME || path.join(requireHomeDir(), '.cache'),
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
