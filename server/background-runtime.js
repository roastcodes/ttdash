function createBackgroundRuntime({
  fs,
  path,
  processObject = process,
  fetchImpl = fetch,
  spawnImpl,
  readlinePromises,
  entrypointPath,
  appPaths,
  ensureAppDirs,
  ensureDir,
  writeJsonAtomic,
  normalizeIsoTimestamp,
  bindHost,
  apiPrefix,
  runtimeInstance,
  normalizedCliArgs,
  cliOptions,
  forceOpenBrowser,
  isWindows,
  secureDirMode,
  secureFileMode,
  backgroundStartTimeoutMs,
  backgroundInstancesLockTimeoutMs,
  backgroundInstancesLockStaleMs,
  sleep,
  isProcessRunning,
  formatDateTime,
}) {
  const backgroundInstancesFile = path.join(appPaths.configDir, 'background-instances.json');
  const backgroundLogDir = path.join(appPaths.cacheDir, 'background');
  const backgroundInstancesLockDir = path.join(appPaths.configDir, 'background-instances.lock');

  async function fetchRuntimeIdentity(url, requestApiPrefix = apiPrefix, timeoutMs = 1000) {
    if (typeof url !== 'string' || !url.trim()) {
      return null;
    }

    const runtimePath = `${String(requestApiPrefix || apiPrefix).replace(/\/+$/, '')}/runtime`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(new URL(runtimePath, `${url}/`), {
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      if (!payload || typeof payload !== 'object') {
        return null;
      }

      return payload;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function isBackgroundInstanceOwned(instance) {
    if (!instance || typeof instance !== 'object') {
      return false;
    }

    if (!isProcessRunning(instance.pid)) {
      return false;
    }

    const runtime = await fetchRuntimeIdentity(instance.url, instance.apiPrefix);
    if (!runtime || typeof runtime.id !== 'string') {
      return false;
    }

    return runtime.id === instance.id && runtime.port === instance.port;
  }

  function normalizeBackgroundInstance(value) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const pid = Number.parseInt(value.pid, 10);
    const port = Number.parseInt(value.port, 10);
    const startedAt = normalizeIsoTimestamp(value.startedAt);
    const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : null;
    const url = typeof value.url === 'string' && value.url.trim() ? value.url.trim() : null;
    const host = typeof value.host === 'string' && value.host.trim() ? value.host.trim() : bindHost;
    const normalizedApiPrefix =
      typeof value.apiPrefix === 'string' && value.apiPrefix.trim()
        ? value.apiPrefix.trim()
        : apiPrefix;

    if (
      !id ||
      !url ||
      !startedAt ||
      !Number.isInteger(pid) ||
      pid <= 0 ||
      !Number.isInteger(port) ||
      port <= 0
    ) {
      return null;
    }

    return {
      id,
      pid,
      port,
      url,
      host,
      apiPrefix: normalizedApiPrefix,
      startedAt,
      logFile:
        typeof value.logFile === 'string' && value.logFile.trim() ? value.logFile.trim() : null,
    };
  }

  function readBackgroundInstancesRaw() {
    try {
      const parsed = JSON.parse(fs.readFileSync(backgroundInstancesFile, 'utf-8'));
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore missing or invalid background registry state.
    }

    return [];
  }

  function writeBackgroundInstances(instances) {
    writeJsonAtomic(backgroundInstancesFile, instances);
  }

  async function readBackgroundInstancesSnapshot() {
    const rawInstances = readBackgroundInstancesRaw();
    const normalized = rawInstances.map(normalizeBackgroundInstance).filter(Boolean);
    const alive = [];

    for (const instance of normalized) {
      if (await isBackgroundInstanceOwned(instance)) {
        alive.push(instance);
      }
    }

    const changed = rawInstances.length !== alive.length;

    alive.sort((left, right) => {
      const byStartedAt = left.startedAt.localeCompare(right.startedAt);
      if (byStartedAt !== 0) {
        return byStartedAt;
      }
      return left.port - right.port;
    });

    return {
      normalized,
      alive,
      changed,
    };
  }

  async function getBackgroundInstances() {
    return (await readBackgroundInstancesSnapshot()).alive;
  }

  async function withBackgroundInstancesLock(
    callback,
    timeoutMs = backgroundInstancesLockTimeoutMs,
  ) {
    const startedAt = Date.now();

    while (true) {
      try {
        ensureDir(path.dirname(backgroundInstancesLockDir));
        fs.mkdirSync(backgroundInstancesLockDir, { mode: secureDirMode });
        if (!isWindows) {
          fs.chmodSync(backgroundInstancesLockDir, secureDirMode);
        }
        break;
      } catch (error) {
        if (!error || error.code !== 'EEXIST') {
          throw error;
        }

        let lockIsStale = false;
        try {
          const stats = fs.statSync(backgroundInstancesLockDir);
          lockIsStale = Date.now() - stats.mtimeMs > backgroundInstancesLockStaleMs;
        } catch {
          // Ignore stat races while the lock directory is changing.
        }

        if (lockIsStale) {
          try {
            fs.rmSync(backgroundInstancesLockDir, { recursive: true, force: true });
            continue;
          } catch {
            // Ignore lock cleanup races and retry until timeout.
          }
        }

        if (Date.now() - startedAt >= timeoutMs) {
          throw new Error('Could not acquire background registry lock.', { cause: error });
        }

        await sleep(50);
      }
    }

    try {
      return await callback();
    } finally {
      try {
        fs.rmSync(backgroundInstancesLockDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup races after the lock holder exits.
      }
    }
  }

  async function pruneBackgroundInstances() {
    return withBackgroundInstancesLock(async () => {
      const snapshot = await readBackgroundInstancesSnapshot();
      if (snapshot.changed) {
        writeBackgroundInstances(snapshot.alive);
      }

      return snapshot.alive;
    });
  }

  async function registerBackgroundInstance(instance) {
    return withBackgroundInstancesLock(async () => {
      const instances = (await readBackgroundInstancesSnapshot()).alive;
      const nextInstances = instances.filter((entry) => entry.pid !== instance.pid);
      nextInstances.push(instance);
      nextInstances.sort((left, right) => {
        const byStartedAt = left.startedAt.localeCompare(right.startedAt);
        if (byStartedAt !== 0) {
          return byStartedAt;
        }
        return left.port - right.port;
      });
      writeBackgroundInstances(nextInstances);
    });
  }

  async function unregisterBackgroundInstance(pid) {
    return withBackgroundInstancesLock(async () => {
      const instances = (await readBackgroundInstancesSnapshot()).alive;
      const nextInstances = instances.filter((entry) => entry.pid !== pid);
      if (nextInstances.length !== instances.length) {
        writeBackgroundInstances(nextInstances);
      }
    });
  }

  function createBackgroundInstance({ port, url }) {
    return {
      id: runtimeInstance.id,
      pid: runtimeInstance.pid,
      port,
      url,
      host: bindHost,
      apiPrefix,
      startedAt: runtimeInstance.startedAt,
      logFile: processObject.env.TTDASH_BACKGROUND_LOG_FILE || null,
    };
  }

  function buildBackgroundLogFilePath() {
    return path.join(backgroundLogDir, `server-${Date.now()}.log`);
  }

  async function waitForBackgroundInstance(pid, timeoutMs = backgroundStartTimeoutMs) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const instance = (await getBackgroundInstances()).find((entry) => entry.pid === pid);
      if (instance) {
        return instance;
      }

      if (!isProcessRunning(pid)) {
        return null;
      }

      await sleep(200);
    }

    return null;
  }

  async function waitForBackgroundInstanceExit(instance, timeoutMs = 5000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (!(await isBackgroundInstanceOwned(instance))) {
        return true;
      }

      await sleep(150);
    }

    return !(await isBackgroundInstanceOwned(instance));
  }

  function formatBackgroundInstanceLabel(instance, index) {
    const parts = [
      `${index + 1}. ${instance.url}`,
      `PID ${instance.pid}`,
      `Port ${instance.port}`,
      `started ${formatDateTime(instance.startedAt)}`,
    ];

    if (instance.logFile) {
      parts.push(`log ${instance.logFile}`);
    }

    return parts.join(' | ');
  }

  async function promptForBackgroundInstance(instances) {
    if (instances.length === 1) {
      return instances[0];
    }

    console.log('Multiple TTDash background servers are running:');
    instances.forEach((instance, index) => {
      console.log(`  ${formatBackgroundInstanceLabel(instance, index)}`);
    });
    console.log('');

    const rl = readlinePromises.createInterface({
      input: processObject.stdin,
      output: processObject.stdout,
    });

    try {
      while (true) {
        const answer = (
          await rl.question(
            `Which instance should be stopped? [1-${instances.length}, Enter=cancel] `,
          )
        ).trim();

        if (!answer) {
          return null;
        }

        const selection = Number.parseInt(answer, 10);
        if (Number.isInteger(selection) && selection >= 1 && selection <= instances.length) {
          return instances[selection - 1];
        }

        console.log(`Invalid selection: ${answer}`);
      }
    } finally {
      rl.close();
    }
  }

  async function stopBackgroundInstance(instance) {
    if (!(await isBackgroundInstanceOwned(instance))) {
      await unregisterBackgroundInstance(instance.pid);
      return {
        status: 'already-stopped',
        instance,
      };
    }

    try {
      processObject.kill(instance.pid, 'SIGTERM');
    } catch (error) {
      if (error && error.code === 'ESRCH') {
        await unregisterBackgroundInstance(instance.pid);
        return {
          status: 'already-stopped',
          instance,
        };
      }

      if (error && error.code === 'EPERM') {
        return {
          status: 'forbidden',
          instance,
        };
      }

      throw error;
    }

    if (await waitForBackgroundInstanceExit(instance)) {
      await unregisterBackgroundInstance(instance.pid);
      return {
        status: 'stopped',
        instance,
      };
    }

    return {
      status: 'timeout',
      instance,
    };
  }

  async function runStopCommand() {
    ensureAppDirs([backgroundLogDir]);

    const instances = await pruneBackgroundInstances();
    if (instances.length === 0) {
      console.log('No running TTDash background servers found.');
      return;
    }

    const selectedInstance = await promptForBackgroundInstance(instances);
    if (!selectedInstance) {
      console.log('Canceled.');
      return;
    }

    const result = await stopBackgroundInstance(selectedInstance);
    if (result.status === 'stopped') {
      console.log(
        `Stopped TTDash background server: ${selectedInstance.url} (PID ${selectedInstance.pid})`,
      );
      return;
    }

    if (result.status === 'already-stopped') {
      console.log(
        `Instance was already stopped and was removed from the registry: ${selectedInstance.url} (PID ${selectedInstance.pid})`,
      );
      return;
    }

    if (result.status === 'forbidden') {
      console.error(
        `Could not stop TTDash background server (permission denied): ${selectedInstance.url} (PID ${selectedInstance.pid})`,
      );
      processObject.exitCode = 1;
      return;
    }

    console.error(
      `TTDash background server did not respond to SIGTERM: ${selectedInstance.url} (PID ${selectedInstance.pid})`,
    );
    if (selectedInstance.logFile) {
      console.error(`Log file: ${selectedInstance.logFile}`);
    }
    processObject.exitCode = 1;
  }

  function shouldBackgroundChildOpenBrowser() {
    return !(
      cliOptions.noOpen ||
      processObject.env.NO_OPEN_BROWSER === '1' ||
      processObject.env.CI === '1'
    );
  }

  async function startInBackground() {
    ensureAppDirs([backgroundLogDir]);

    const logFile = buildBackgroundLogFilePath();
    const childArgs = normalizedCliArgs.filter((arg) => arg !== '--background');
    const logFd = fs.openSync(logFile, 'a', secureFileMode);
    if (!isWindows) {
      fs.fchmodSync(logFd, secureFileMode);
    }

    let child;
    try {
      child = spawnImpl(processObject.execPath, [entrypointPath, ...childArgs], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        env: {
          ...processObject.env,
          TTDASH_BACKGROUND_CHILD: '1',
          TTDASH_BACKGROUND_LOG_FILE: logFile,
          TTDASH_FORCE_OPEN_BROWSER:
            forceOpenBrowser || shouldBackgroundChildOpenBrowser() ? '1' : '0',
        },
      });
    } finally {
      fs.closeSync(logFd);
    }

    child.unref();

    const instance = await waitForBackgroundInstance(child.pid);
    if (!instance) {
      const logOutput = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf-8').trim() : '';
      throw new Error(
        logOutput || `Could not start TTDash as a background process. Log: ${logFile}`,
      );
    }

    console.log('TTDash is running in the background.');
    console.log(`  URL:  ${instance.url}`);
    console.log(`  PID:  ${instance.pid}`);
    console.log(`  Log:  ${logFile}`);
    console.log('');
    console.log('Stop it with:');
    console.log('  ttdash stop');
  }

  return {
    paths: {
      backgroundInstancesFile,
      backgroundLogDir,
      backgroundInstancesLockDir,
    },
    fetchRuntimeIdentity,
    isBackgroundInstanceOwned,
    getBackgroundInstances,
    pruneBackgroundInstances,
    registerBackgroundInstance,
    unregisterBackgroundInstance,
    createBackgroundInstance,
    runStopCommand,
    startInBackground,
  };
}

module.exports = {
  createBackgroundRuntime,
};
