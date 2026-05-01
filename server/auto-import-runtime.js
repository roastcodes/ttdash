const { createExclusiveRuntimeLease, createExpiringAsyncCache } = require('./runtime-state');
const { createAutoImportCommandRunner } = require('./auto-import-runtime/command-runner');
const { createAutoImportExecutor } = require('./auto-import-runtime/import-executor');
const { createLatestToktrackVersionLookup } = require('./auto-import-runtime/latest-version');
const { createAutoImportMessages } = require('./auto-import-runtime/messages');
const { createToktrackRunnerResolver } = require('./auto-import-runtime/toktrack-runners');

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
  probeLog,
}) {
  const messages = createAutoImportMessages({
    toktrackVersion,
  });
  const commandRunner = createAutoImportCommandRunner({
    processObject,
    spawnCrossPlatform,
    isWindows,
    processTerminationGraceMs,
  });
  const runnerResolver = createToktrackRunnerResolver({
    fs,
    processObject,
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
    probeLog,
  });
  const latestVersionLookup = createLatestToktrackVersionLookup({
    createExpiringAsyncCache,
    commandRunner,
    processObject,
    toktrackPackageName,
    toktrackVersion,
    npxCacheDir,
    toktrackLatestLookupTimeoutMs,
    toktrackLatestCacheSuccessTtlMs,
    toktrackLatestCacheFailureTtlMs,
  });
  const importExecutor = createAutoImportExecutor({
    createExclusiveRuntimeLease,
    messages,
    runnerResolver,
    normalizeIncomingData,
    withSettingsAndDataMutationLock,
    writeData,
    updateDataLoadState,
  });

  return {
    acquireAutoImportLease: importExecutor.acquireAutoImportLease,
    commandExists: commandRunner.commandExists,
    createAutoImportMessageEvent: messages.createAutoImportMessageEvent,
    formatAutoImportMessageEvent: messages.formatAutoImportMessageEvent,
    getExecutableName: commandRunner.getExecutableName,
    getLocalToktrackDisplayCommand: runnerResolver.getLocalToktrackDisplayCommand,
    getToktrackLatestLookupTimeoutMs: latestVersionLookup.getToktrackLatestLookupTimeoutMs,
    getToktrackRunnerTimeouts: runnerResolver.getToktrackRunnerTimeouts,
    isAutoImportRunning: importExecutor.isAutoImportRunning,
    lookupLatestToktrackVersion: latestVersionLookup.lookupLatestToktrackVersion,
    parseToktrackVersionOutput: runnerResolver.parseToktrackVersionOutput,
    performAutoImport: importExecutor.performAutoImport,
    resetLatestToktrackVersionCache: latestVersionLookup.resetLatestToktrackVersionCache,
    resolveToktrackRunner: runnerResolver.resolveToktrackRunner,
    runCommandWithSpawn: commandRunner.runCommandWithSpawn,
    runStartupAutoLoad: importExecutor.runStartupAutoLoad,
    runToktrack: runnerResolver.runToktrack,
    toAutoImportErrorEvent: messages.toAutoImportErrorEvent,
    toAutoImportRunnerResolutionError: runnerResolver.toAutoImportRunnerResolutionError,
  };
}

module.exports = {
  createAutoImportRuntime,
};
