const { formatCurrency, formatDayCount, formatErrorMessage } = require('../runtime-formatters');

function createAutoImportExecutor({
  createExclusiveRuntimeLease,
  messages,
  runnerResolver,
  normalizeIncomingData,
  withSettingsAndDataMutationLock,
  writeData,
  updateDataLoadState,
}) {
  const {
    createAutoImportError,
    createAutoImportMessageEvent,
    formatAutoImportMessageEvent,
    getTimeoutSeconds,
    summarizeCommandError,
  } = messages;
  const {
    getToktrackRunnerTimeouts,
    isPackageToktrackRunner,
    parseToktrackVersionOutput,
    resolveToktrackRunnerWithDiagnostics,
    runToktrack,
    toAutoImportRunnerResolutionError,
  } = runnerResolver;

  function createAutoImportAlreadyRunningError() {
    return createAutoImportError(
      'An auto-import is already running. Please wait.',
      'autoImportRunning',
    );
  }

  const autoImportLease = createExclusiveRuntimeLease({
    createAlreadyRunningError: createAutoImportAlreadyRunningError,
  });

  function acquireAutoImportLease() {
    return autoImportLease.acquire();
  }

  async function performAutoImport({
    source = 'auto-import',
    onCheck = () => {},
    onProgress = () => {},
    onOutput = () => {},
    signalOnClose,
    lease = null,
  } = {}) {
    const ownsLease = !lease;
    const activeLease = lease || acquireAutoImportLease();
    let progressSeconds = 0;
    const progressInterval = setInterval(() => {
      progressSeconds += 5;
      onProgress(createAutoImportMessageEvent('processingUsageData', { seconds: progressSeconds }));
    }, 5000);
    progressInterval.unref?.();

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
      if (ownsLease) {
        activeLease.release();
      }
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

      log(
        `Auto-load complete: imported ${formatDayCount(result.days)}, ${formatCurrency(
          result.totalCost,
        )}.`,
      );
      return result;
    } catch (error) {
      errorLog(`Auto-load failed: ${formatErrorMessage(error)}`);
      errorLog('Dashboard will start without newly imported data.');
      return null;
    }
  }

  return {
    acquireAutoImportLease,
    isAutoImportRunning: autoImportLease.isActive,
    performAutoImport,
    runStartupAutoLoad,
  };
}

module.exports = {
  createAutoImportExecutor,
};
