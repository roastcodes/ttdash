function createAutoImportRuntime({
  fs,
  processObject = process,
  spawnCrossPlatform,
  normalizeIncomingData,
  withSettingsAndDataMutationLock,
  writeData,
  updateDataLoadState,
  toktrackPackageName,
  toktrackPackageSpec,
  toktrackVersion,
  toktrackLocalBin,
  npxCacheDir,
  isWindows,
  processTerminationGraceMs,
  toktrackLocalRunnerProbeTimeoutMs,
  toktrackLocalRunnerVersionCheckTimeoutMs,
  toktrackLocalRunnerImportTimeoutMs,
  toktrackPackageRunnerProbeTimeoutMs,
  toktrackPackageRunnerVersionCheckTimeoutMs,
  toktrackPackageRunnerImportTimeoutMs,
  toktrackLatestLookupTimeoutMs,
  toktrackLatestCacheSuccessTtlMs,
  toktrackLatestCacheFailureTtlMs,
}) {
  let autoImportRunning = false;
  let latestToktrackVersionCache = null;
  let latestToktrackVersionLookupPromise = null;

  function createAutoImportMessageEvent(key, vars = {}) {
    return {
      key,
      vars,
    };
  }

  function createAutoImportError(message, key, vars = {}) {
    const error = new Error(message);
    error.messageKey = key;
    error.messageVars = vars;
    return error;
  }

  function summarizeCommandError(error, fallbackMessage = 'Unknown error') {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return fallbackMessage;
  }

  function getTimeoutSeconds(timeoutMs) {
    return Math.max(1, Math.ceil(Number(timeoutMs) / 1000));
  }

  function toAutoImportErrorEvent(error) {
    if (error && typeof error.messageKey === 'string') {
      return createAutoImportMessageEvent(error.messageKey, error.messageVars || {});
    }

    return createAutoImportMessageEvent('errorPrefix', {
      message: error && error.message ? error.message : 'Unknown error',
    });
  }

  function formatAutoImportMessageEvent(event) {
    switch (event?.key) {
      case 'startingLocalImport':
        return 'Starting toktrack import...';
      case 'warmingUpPackageRunner':
        return `Preparing ${event.vars?.runner || 'package runner'} (the first run may take longer while toktrack is downloaded)...`;
      case 'loadingUsageData':
        return `Loading usage data via ${event.vars?.command || 'unknown command'}...`;
      case 'processingUsageData':
        return `Processing usage data... (${event.vars?.seconds || 0}s)`;
      case 'autoImportRunning':
        return 'An auto-import is already running. Please wait.';
      case 'noRunnerFound':
        return 'No local toktrack, Bun, or npm exec installation found.';
      case 'localToktrackVersionMismatch':
        return `Local toktrack v${event.vars?.detectedVersion || 'unknown'} does not match the required v${event.vars?.expectedVersion || toktrackVersion}.`;
      case 'localToktrackFailed':
        return `Local toktrack could not be started: ${event.vars?.message || 'Unknown error'}`;
      case 'packageRunnerFailed':
        return `No compatible bunx or npm exec runner succeeded: ${event.vars?.message || 'Unknown error'}`;
      case 'packageRunnerWarmupTimedOut':
        return `${event.vars?.runner || 'The package runner'} took longer than ${event.vars?.seconds || 0}s to prepare toktrack. The first run may need to download the package first. Please try again or verify network access.`;
      case 'toktrackVersionCheckFailed':
        return `Toktrack was found, but the version check failed: ${event.vars?.message || 'Unknown error'}`;
      case 'toktrackExecutionFailed':
        return `Toktrack failed while loading usage data: ${event.vars?.message || 'Unknown error'}`;
      case 'toktrackExecutionTimedOut':
        return `Toktrack did not finish loading usage data within ${event.vars?.seconds || 0}s via ${event.vars?.runner || 'the selected runner'}. Please try again.`;
      case 'toktrackInvalidJson':
        return `Toktrack returned invalid JSON output: ${event.vars?.message || 'Unknown error'}`;
      case 'toktrackInvalidData':
        return `Toktrack returned data that TTDash could not process: ${event.vars?.message || 'Unknown error'}`;
      case 'errorPrefix':
        return `Error: ${event.vars?.message || 'Unknown error'}`;
      default:
        return 'Auto-import update';
    }
  }

  function getExecutableName(baseName, forceWindows = isWindows) {
    if (!forceWindows) {
      return baseName;
    }

    switch (baseName) {
      case 'npm':
        return 'npm.cmd';
      case 'bun':
      case 'bunx':
        return 'bun.exe';
      case 'npx':
        return 'npx.cmd';
      default:
        return baseName;
    }
  }

  function spawnCommand(command, args, options = {}) {
    return spawnCrossPlatform(command, args, {
      ...options,
      windowsHide: options.windowsHide ?? true,
    });
  }

  function commandExists(command, args = ['--version']) {
    return new Promise((resolve) => {
      const child = spawnCommand(command, args, { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('close', (code) => resolve(code === 0));
    });
  }

  function parseToktrackVersionOutput(output) {
    return String(output)
      .trim()
      .replace(/^toktrack\s+/, '');
  }

  function getLocalToktrackDisplayCommand(forceWindows = isWindows) {
    if (processObject.env.TTDASH_TOKTRACK_LOCAL_BIN) {
      return `${toktrackLocalBin} daily --json`;
    }

    return forceWindows
      ? 'node_modules\\.bin\\toktrack.cmd daily --json'
      : 'node_modules/.bin/toktrack daily --json';
  }

  function createLocalToktrackRunner() {
    return {
      command: toktrackLocalBin,
      prefixArgs: [],
      env: processObject.env,
      method: 'local',
      label: 'local toktrack',
      displayCommand: getLocalToktrackDisplayCommand(),
    };
  }

  function createBunxToktrackRunner() {
    return {
      command: getExecutableName('bunx'),
      prefixArgs: isWindows ? ['x', toktrackPackageSpec] : [toktrackPackageSpec],
      env: processObject.env,
      method: 'bunx',
      label: 'bunx',
      displayCommand: `bunx ${toktrackPackageSpec} daily --json`,
    };
  }

  function createNpxToktrackRunner() {
    return {
      command: getExecutableName('npx'),
      prefixArgs: ['--yes', toktrackPackageSpec],
      env: {
        ...processObject.env,
        npm_config_cache: npxCacheDir,
      },
      method: 'npm',
      label: 'npm exec',
      displayCommand: `npx --yes ${toktrackPackageSpec} daily --json`,
    };
  }

  function isPackageToktrackRunner(runner) {
    return runner?.method === 'bunx' || runner?.method === 'npm';
  }

  function getToktrackRunnerTimeouts(runner) {
    if (isPackageToktrackRunner(runner)) {
      return {
        probeMs: toktrackPackageRunnerProbeTimeoutMs,
        versionCheckMs: toktrackPackageRunnerVersionCheckTimeoutMs,
        importMs: toktrackPackageRunnerImportTimeoutMs,
      };
    }

    return {
      probeMs: toktrackLocalRunnerProbeTimeoutMs,
      versionCheckMs: toktrackLocalRunnerVersionCheckTimeoutMs,
      importMs: toktrackLocalRunnerImportTimeoutMs,
    };
  }

  function formatCommandForDisplay(command, args = []) {
    return [command, ...args].join(' ').trim();
  }

  function createCommandError(
    message,
    { command, args = [], stdout = '', stderr = '', exitCode = null, timedOut = false } = {},
  ) {
    const error = new Error(message);
    error.command = command;
    error.args = args;
    error.stdout = stdout;
    error.stderr = stderr;
    error.exitCode = exitCode;
    error.timedOut = timedOut;
    return error;
  }

  function terminateChildProcess(child) {
    if (!child || child.exitCode !== null) {
      return;
    }

    child.kill('SIGTERM');

    const forceKillTimeout = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, processTerminationGraceMs);

    child.once('close', () => {
      clearTimeout(forceKillTimeout);
    });
  }

  function runCommand(
    command,
    args,
    {
      env = processObject.env,
      streamStderr = false,
      onStderr,
      signalOnClose,
      timeoutMs = null,
    } = {},
  ) {
    return runCommandWithSpawn(command, args, {
      env,
      streamStderr,
      onStderr,
      signalOnClose,
      timeoutMs,
      spawnImpl: spawnCommand,
    });
  }

  function runCommandWithSpawn(
    command,
    args,
    {
      env = processObject.env,
      streamStderr = false,
      onStderr,
      signalOnClose,
      timeoutMs = null,
      spawnImpl = spawnCommand,
    } = {},
  ) {
    return new Promise((resolve, reject) => {
      const child = spawnImpl(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      });
      const commandLabel = formatCommandForDisplay(command, args);

      let stdout = '';
      let stderr = '';
      let finished = false;
      let timeoutId = null;
      let timeoutError = null;

      const settle = (handler, value) => {
        if (finished) {
          return;
        }
        finished = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        handler(value);
      };

      if (signalOnClose) {
        signalOnClose(() => terminateChildProcess(child));
      }

      if (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          timeoutError = createCommandError(
            `Command timed out after ${timeoutMs}ms: ${commandLabel}`,
            {
              command,
              args,
              stdout,
              stderr,
              timedOut: true,
            },
          );
          terminateChildProcess(child);
        }, timeoutMs);
      }

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        const line = chunk.toString();
        stderr += line;
        if (streamStderr && onStderr && line.trim()) {
          onStderr(line.trimEnd());
        }
      });

      child.on('error', (error) =>
        settle(
          reject,
          createCommandError(error.message || `Could not start ${commandLabel}.`, {
            command,
            args,
            stdout,
            stderr,
          }),
        ),
      );
      child.on('close', (code) => {
        if (finished) {
          return;
        }
        if (timeoutError) {
          settle(reject, timeoutError);
          return;
        }
        if (code === 0) {
          settle(resolve, stdout.trimEnd());
          return;
        }
        settle(
          reject,
          createCommandError(
            stderr.trim() || stdout.trim() || `Command exited with code ${code}: ${commandLabel}`,
            {
              command,
              args,
              stdout,
              stderr,
              exitCode: code,
            },
          ),
        );
      });
    });
  }

  function runToktrack(
    runner,
    args,
    { streamStderr = false, onStderr, signalOnClose, timeoutMs = null } = {},
  ) {
    return runCommand(runner.command, [...runner.prefixArgs, ...args], {
      env: runner.env,
      streamStderr,
      onStderr,
      signalOnClose,
      timeoutMs,
    });
  }

  async function probeToktrackRunner(
    runner,
    timeoutMs = getToktrackRunnerTimeouts(runner).probeMs,
  ) {
    try {
      await runToktrack(runner, ['--version'], { timeoutMs });
      return {
        ok: true,
        errorMessage: null,
        timedOut: false,
      };
    } catch (error) {
      const message = summarizeCommandError(error, `Could not start ${runner.label}.`);
      console.warn(`Failed to probe ${runner.label}: ${message}`);
      return {
        ok: false,
        errorMessage: message,
        timedOut: Boolean(error?.timedOut),
      };
    }
  }

  async function resolveToktrackRunnerWithDiagnostics() {
    const resolution = {
      runner: null,
      localVersionMismatch: null,
      localFailure: null,
      runnerFailures: [],
    };

    if (fs.existsSync(toktrackLocalBin)) {
      const localRunner = createLocalToktrackRunner();

      try {
        const localVersion = parseToktrackVersionOutput(
          await runToktrack(localRunner, ['--version'], {
            timeoutMs: getToktrackRunnerTimeouts(localRunner).probeMs,
          }),
        );
        if (localVersion === toktrackVersion) {
          resolution.runner = localRunner;
          return resolution;
        }
        resolution.localVersionMismatch = {
          detectedVersion: localVersion || 'unknown',
          expectedVersion: toktrackVersion,
        };
      } catch (error) {
        resolution.localFailure = summarizeCommandError(
          error,
          'The local toktrack binary could not be started.',
        );
      }
    }

    const bunxRunner = createBunxToktrackRunner();
    const bunxProbe = await probeToktrackRunner(bunxRunner);
    if (bunxProbe.ok) {
      resolution.runner = bunxRunner;
      return resolution;
    }
    if (bunxProbe.errorMessage) {
      resolution.runnerFailures.push({
        label: bunxRunner.label,
        message: bunxProbe.errorMessage,
        timedOut: bunxProbe.timedOut,
      });
    }

    const npxRunner = createNpxToktrackRunner();
    const npxProbe = await probeToktrackRunner(npxRunner);
    if (npxProbe.ok) {
      resolution.runner = npxRunner;
      return resolution;
    }
    if (npxProbe.errorMessage) {
      resolution.runnerFailures.push({
        label: npxRunner.label,
        message: npxProbe.errorMessage,
        timedOut: npxProbe.timedOut,
      });
    }

    return resolution;
  }

  async function resolveToktrackRunner() {
    const resolution = await resolveToktrackRunnerWithDiagnostics();
    return resolution.runner;
  }

  function toAutoImportRunnerResolutionError(resolution) {
    if (resolution.localVersionMismatch) {
      return createAutoImportError(
        formatAutoImportMessageEvent(
          createAutoImportMessageEvent(
            'localToktrackVersionMismatch',
            resolution.localVersionMismatch,
          ),
        ),
        'localToktrackVersionMismatch',
        resolution.localVersionMismatch,
      );
    }

    if (resolution.localFailure) {
      return createAutoImportError(
        formatAutoImportMessageEvent(
          createAutoImportMessageEvent('localToktrackFailed', {
            message: resolution.localFailure,
          }),
        ),
        'localToktrackFailed',
        {
          message: resolution.localFailure,
        },
      );
    }

    if (resolution.runnerFailures.length > 0) {
      const timedOutRunnerFailures = resolution.runnerFailures.filter(
        (failure) => failure.timedOut,
      );
      if (
        timedOutRunnerFailures.length > 0 &&
        timedOutRunnerFailures.length === resolution.runnerFailures.length
      ) {
        const runners = timedOutRunnerFailures.map((failure) => failure.label).join(' / ');
        const seconds = getTimeoutSeconds(toktrackPackageRunnerProbeTimeoutMs);
        return createAutoImportError(
          formatAutoImportMessageEvent(
            createAutoImportMessageEvent('packageRunnerWarmupTimedOut', {
              runner: runners,
              seconds,
            }),
          ),
          'packageRunnerWarmupTimedOut',
          {
            runner: runners,
            seconds,
          },
        );
      }

      return createAutoImportError(
        formatAutoImportMessageEvent(
          createAutoImportMessageEvent('packageRunnerFailed', {
            message: resolution.runnerFailures
              .map((failure) => `${failure.label}: ${failure.message}`)
              .join(' | '),
          }),
        ),
        'packageRunnerFailed',
        {
          message: resolution.runnerFailures
            .map((failure) => `${failure.label}: ${failure.message}`)
            .join(' | '),
        },
      );
    }

    return createAutoImportError(
      'No local toktrack, Bun, or npm exec installation found.',
      'noRunnerFound',
    );
  }

  async function lookupLatestToktrackVersion(timeoutMs = toktrackLatestLookupTimeoutMs) {
    const now = Date.now();
    if (latestToktrackVersionCache && now < latestToktrackVersionCache.expiresAt) {
      return latestToktrackVersionCache.value;
    }

    if (latestToktrackVersionLookupPromise) {
      return latestToktrackVersionLookupPromise;
    }

    latestToktrackVersionLookupPromise = (async () => {
      try {
        const latestVersion = String(
          await runCommand(
            getExecutableName('npm'),
            ['view', `${toktrackPackageName}@latest`, 'version'],
            {
              env: {
                ...processObject.env,
                npm_config_cache: npxCacheDir,
              },
              timeoutMs,
            },
          ),
        ).trim();

        const result = {
          configuredVersion: toktrackVersion,
          latestVersion,
          isLatest: latestVersion === toktrackVersion,
          lookupStatus: 'ok',
        };

        latestToktrackVersionCache = {
          value: result,
          expiresAt: Date.now() + toktrackLatestCacheSuccessTtlMs,
        };
        return result;
      } catch (error) {
        const result = {
          configuredVersion: toktrackVersion,
          latestVersion: null,
          isLatest: null,
          lookupStatus: 'failed',
          message:
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : 'Could not determine the latest toktrack version.',
        };

        latestToktrackVersionCache = {
          value: result,
          expiresAt: Date.now() + toktrackLatestCacheFailureTtlMs,
        };
        return result;
      } finally {
        latestToktrackVersionLookupPromise = null;
      }
    })();

    return latestToktrackVersionLookupPromise;
  }

  async function performAutoImport({
    source = 'auto-import',
    onCheck = () => {},
    onProgress = () => {},
    onOutput = () => {},
    signalOnClose,
  } = {}) {
    if (autoImportRunning) {
      throw createAutoImportError(
        'An auto-import is already running. Please wait.',
        'autoImportRunning',
      );
    }

    autoImportRunning = true;
    let progressSeconds = 0;
    const progressInterval = setInterval(() => {
      progressSeconds += 5;
      onProgress(createAutoImportMessageEvent('processingUsageData', { seconds: progressSeconds }));
    }, 5000);

    try {
      onCheck({ tool: 'toktrack', status: 'checking' });
      onProgress(createAutoImportMessageEvent('startingLocalImport'));

      const resolution = await resolveToktrackRunnerWithDiagnostics();
      const runner = resolution.runner;
      if (!runner) {
        const resolutionError = toAutoImportRunnerResolutionError(resolution);
        if (resolutionError.messageKey === 'noRunnerFound') {
          onCheck({ tool: 'toktrack', status: 'not_found' });
        }
        throw resolutionError;
      }

      if (isPackageToktrackRunner(runner)) {
        onProgress(
          createAutoImportMessageEvent('warmingUpPackageRunner', {
            runner: runner.label,
          }),
        );
      }

      let versionResult;
      try {
        versionResult = await runToktrack(runner, ['--version'], {
          timeoutMs: getToktrackRunnerTimeouts(runner).versionCheckMs,
        });
      } catch (error) {
        if (isPackageToktrackRunner(runner) && error?.timedOut) {
          throw createAutoImportError(
            formatAutoImportMessageEvent(
              createAutoImportMessageEvent('packageRunnerWarmupTimedOut', {
                runner: runner.label,
                seconds: getTimeoutSeconds(getToktrackRunnerTimeouts(runner).versionCheckMs),
              }),
            ),
            'packageRunnerWarmupTimedOut',
            {
              runner: runner.label,
              seconds: getTimeoutSeconds(getToktrackRunnerTimeouts(runner).versionCheckMs),
            },
          );
        }

        throw createAutoImportError(
          formatAutoImportMessageEvent(
            createAutoImportMessageEvent('toktrackVersionCheckFailed', {
              message: summarizeCommandError(error),
            }),
          ),
          'toktrackVersionCheckFailed',
          {
            message: summarizeCommandError(error),
          },
        );
      }

      onCheck({
        tool: 'toktrack',
        status: 'found',
        method: runner.label,
        version: parseToktrackVersionOutput(versionResult),
      });
      onProgress(
        createAutoImportMessageEvent('loadingUsageData', {
          command: runner.displayCommand,
        }),
      );

      let rawJson;
      try {
        rawJson = await runToktrack(runner, ['daily', '--json'], {
          streamStderr: true,
          onStderr: (line) => {
            onOutput(line);
          },
          signalOnClose,
          timeoutMs: getToktrackRunnerTimeouts(runner).importMs,
        });
      } catch (error) {
        if (error?.timedOut) {
          throw createAutoImportError(
            formatAutoImportMessageEvent(
              createAutoImportMessageEvent('toktrackExecutionTimedOut', {
                runner: runner.label,
                seconds: getTimeoutSeconds(getToktrackRunnerTimeouts(runner).importMs),
              }),
            ),
            'toktrackExecutionTimedOut',
            {
              runner: runner.label,
              seconds: getTimeoutSeconds(getToktrackRunnerTimeouts(runner).importMs),
            },
          );
        }

        throw createAutoImportError(
          formatAutoImportMessageEvent(
            createAutoImportMessageEvent('toktrackExecutionFailed', {
              message: summarizeCommandError(error),
            }),
          ),
          'toktrackExecutionFailed',
          {
            message: summarizeCommandError(error),
          },
        );
      }

      let parsedJson;
      try {
        parsedJson = JSON.parse(rawJson);
      } catch (error) {
        throw createAutoImportError(
          formatAutoImportMessageEvent(
            createAutoImportMessageEvent('toktrackInvalidJson', {
              message: summarizeCommandError(error),
            }),
          ),
          'toktrackInvalidJson',
          {
            message: summarizeCommandError(error),
          },
        );
      }

      let normalized;
      try {
        normalized = normalizeIncomingData(parsedJson);
      } catch (error) {
        throw createAutoImportError(
          formatAutoImportMessageEvent(
            createAutoImportMessageEvent('toktrackInvalidData', {
              message: summarizeCommandError(error),
            }),
          ),
          'toktrackInvalidData',
          {
            message: summarizeCommandError(error),
          },
        );
      }

      await withSettingsAndDataMutationLock(async () => {
        await writeData(normalized);
        await updateDataLoadState({
          lastLoadedAt: new Date().toISOString(),
          lastLoadSource: source,
        });
      });

      return {
        days: normalized.daily.length,
        totalCost: normalized.totals.totalCost,
      };
    } finally {
      clearInterval(progressInterval);
      autoImportRunning = false;
    }
  }

  async function runStartupAutoLoad({
    source = 'cli-auto-load',
    log = console.log,
    errorLog = console.error,
  } = {}) {
    log('Auto-load enabled, starting import...');

    try {
      const result = await performAutoImport({
        source,
        onCheck: (event) => {
          if (event.status === 'found') {
            log(`toktrack found (${event.method}, v${event.version})`);
          }
        },
        onProgress: (event) => {
          log(formatAutoImportMessageEvent(event));
        },
        onOutput: (line) => {
          log(line);
        },
      });

      log(`Auto-load complete: imported ${result.days} days, ${result.totalCost}.`);
      return result;
    } catch (error) {
      errorLog(`Auto-load failed: ${error.message}`);
      errorLog('Dashboard will start without newly imported data.');
      return null;
    }
  }

  function getToktrackLatestLookupTimeoutMs() {
    return toktrackLatestLookupTimeoutMs;
  }

  function resetLatestToktrackVersionCache() {
    latestToktrackVersionCache = null;
    latestToktrackVersionLookupPromise = null;
  }

  return {
    commandExists,
    createAutoImportMessageEvent,
    formatAutoImportMessageEvent,
    getExecutableName,
    getLocalToktrackDisplayCommand,
    getToktrackLatestLookupTimeoutMs,
    getToktrackRunnerTimeouts,
    isAutoImportRunning: () => autoImportRunning,
    lookupLatestToktrackVersion,
    parseToktrackVersionOutput,
    performAutoImport,
    resetLatestToktrackVersionCache,
    resolveToktrackRunner,
    runCommandWithSpawn,
    runStartupAutoLoad,
    runToktrack,
    toAutoImportErrorEvent,
    toAutoImportRunnerResolutionError,
  };
}

module.exports = {
  createAutoImportRuntime,
};
