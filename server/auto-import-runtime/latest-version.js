const exactSemverPattern =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function validateLatestVersionOutput(output) {
  const latestVersion = String(output).trim();

  if (!latestVersion) {
    return {
      latestVersion: null,
      message: 'npm returned no toktrack version.',
      ok: false,
    };
  }

  if (!exactSemverPattern.test(latestVersion)) {
    return {
      latestVersion: null,
      message: `npm returned an invalid toktrack version: ${latestVersion}`,
      ok: false,
    };
  }

  return {
    latestVersion,
    message: null,
    ok: true,
  };
}

function createLatestToktrackVersionLookup({
  createExpiringAsyncCache,
  commandRunner,
  processObject = process,
  toktrackPackageName,
  toktrackVersion,
  npxCacheDir,
  toktrackLatestLookupTimeoutMs,
  toktrackLatestCacheSuccessTtlMs,
  toktrackLatestCacheFailureTtlMs,
}) {
  const latestToktrackVersionStatusCache = createExpiringAsyncCache({
    load: async () => {
      try {
        const latestVersionResult = validateLatestVersionOutput(
          await commandRunner.runCommand(
            commandRunner.getExecutableName('npm'),
            ['view', `${toktrackPackageName}@latest`, 'version'],
            {
              env: {
                ...processObject.env,
                npm_config_cache: npxCacheDir,
              },
              timeoutMs: toktrackLatestLookupTimeoutMs,
            },
          ),
        );

        if (!latestVersionResult.ok) {
          return {
            configuredVersion: toktrackVersion,
            latestVersion: null,
            isLatest: null,
            lookupStatus: 'malformed-output',
            message: latestVersionResult.message,
          };
        }

        return {
          configuredVersion: toktrackVersion,
          latestVersion: latestVersionResult.latestVersion,
          isLatest: latestVersionResult.latestVersion === toktrackVersion,
          lookupStatus: 'ok',
        };
      } catch (error) {
        return {
          configuredVersion: toktrackVersion,
          latestVersion: null,
          isLatest: null,
          lookupStatus: 'failed',
          message:
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : 'Could not determine the latest toktrack version.',
        };
      }
    },
    getTtlMs: (value) =>
      value.lookupStatus === 'ok'
        ? toktrackLatestCacheSuccessTtlMs
        : toktrackLatestCacheFailureTtlMs,
  });

  async function lookupLatestToktrackVersion() {
    return latestToktrackVersionStatusCache.lookup();
  }

  function getToktrackLatestLookupTimeoutMs() {
    return toktrackLatestLookupTimeoutMs;
  }

  function resetLatestToktrackVersionCache() {
    latestToktrackVersionStatusCache.reset();
  }

  return {
    getToktrackLatestLookupTimeoutMs,
    lookupLatestToktrackVersion,
    resetLatestToktrackVersionCache,
  };
}

module.exports = {
  createLatestToktrackVersionLookup,
};
