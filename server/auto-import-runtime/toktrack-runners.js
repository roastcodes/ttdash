function createToktrackRunnerResolver({
  fs,
  processObject = process,
  commandRunner,
  messages,
  toktrackPackageSpec,
  toktrackVersion,
  toktrackLocalBin,
  npxCacheDir,
  isWindows,
  toktrackLocalRunnerProbeTimeoutMs,
  toktrackLocalRunnerVersionCheckTimeoutMs,
  toktrackLocalRunnerImportTimeoutMs,
  toktrackPackageRunnerProbeTimeoutMs,
  toktrackPackageRunnerVersionCheckTimeoutMs,
  toktrackPackageRunnerImportTimeoutMs,
  probeLog = () => {},
}) {
  const {
    createAutoImportError,
    createAutoImportMessageEvent,
    formatAutoImportMessageEvent,
    getTimeoutSeconds,
    summarizeCommandError,
  } = messages;
  const { getExecutableName, runCommand } = commandRunner;

  function parseToktrackVersionOutput(output) {
    return String(output)
      .trim()
      .replace(/^toktrack\s+/, '');
  }

  function getConfiguredLocalToktrackBin() {
    return processObject.env.TTDASH_TOKTRACK_LOCAL_BIN || toktrackLocalBin;
  }

  function getLocalToktrackDisplayCommand(forceWindows = isWindows) {
    if (processObject.env.TTDASH_TOKTRACK_LOCAL_BIN) {
      return `${getConfiguredLocalToktrackBin()} daily --json`;
    }

    return forceWindows
      ? 'node_modules\\.bin\\toktrack.cmd daily --json'
      : 'node_modules/.bin/toktrack daily --json';
  }

  function createLocalToktrackRunner() {
    return {
      command: getConfiguredLocalToktrackBin(),
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
      probeLog(`Failed to probe ${runner.label}: ${message}`);
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

    if (fs.existsSync(getConfiguredLocalToktrackBin())) {
      const localRunner = createLocalToktrackRunner();

      try {
        const localVersion = parseToktrackVersionOutput(
          await runToktrack(localRunner, ['--version'], {
            timeoutMs: getToktrackRunnerTimeouts(localRunner).versionCheckMs,
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

      const runnerFailuresMessage = resolution.runnerFailures
        .map((failure) => `${failure.label}: ${failure.message}`)
        .join(' | ');

      return createAutoImportError(
        formatAutoImportMessageEvent(
          createAutoImportMessageEvent('packageRunnerFailed', {
            message: runnerFailuresMessage,
          }),
        ),
        'packageRunnerFailed',
        {
          message: runnerFailuresMessage,
        },
      );
    }

    return createAutoImportError(
      'No local toktrack, Bun, or npm exec installation found.',
      'noRunnerFound',
    );
  }

  return {
    getLocalToktrackDisplayCommand,
    getToktrackRunnerTimeouts,
    isPackageToktrackRunner,
    parseToktrackVersionOutput,
    resolveToktrackRunner,
    resolveToktrackRunnerWithDiagnostics,
    runToktrack,
    toAutoImportRunnerResolutionError,
  };
}

module.exports = {
  createToktrackRunnerResolver,
};
