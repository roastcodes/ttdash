import { TOKTRACK_VERSION, createAutoImportRuntime } from './server-helpers.shared'
import type { createSpawnSequence } from './server-helpers.shared'

export function createRuntimeWithSpawn(
  spawnImpl: ReturnType<typeof createSpawnSequence>,
  options: {
    latestLookupTimeoutMs?: number
    localBinExists?: boolean
    localBinOverride?: string
    localProbeTimeoutMs?: number
    localVersionCheckTimeoutMs?: number
    processTerminationGraceMs?: number | undefined
  } = {},
) {
  const localBin = options.localBinOverride ?? '/missing/toktrack'
  const processTerminationGraceMs = Object.prototype.hasOwnProperty.call(
    options,
    'processTerminationGraceMs',
  )
    ? options.processTerminationGraceMs
    : 1000

  return createAutoImportRuntime({
    fs: {
      existsSync: (filePath: string) => Boolean(options.localBinExists && filePath === localBin),
    },
    processObject: {
      env: options.localBinOverride ? { TTDASH_TOKTRACK_LOCAL_BIN: options.localBinOverride } : {},
    },
    spawnCrossPlatform: spawnImpl,
    normalizeIncomingData: (input: unknown) => input,
    withSettingsAndDataMutationLock: async (operation: () => Promise<unknown>) => operation(),
    writeData: () => undefined,
    updateDataLoadState: async () => undefined,
    toktrackPackageName: 'toktrack',
    toktrackPackageSpec: `toktrack@${TOKTRACK_VERSION}`,
    toktrackVersion: TOKTRACK_VERSION,
    toktrackLocalBin: localBin,
    npxCacheDir: '/tmp/ttdash-test-npx-cache',
    isWindows: false,
    processTerminationGraceMs,
    toktrackLocalRunnerProbeTimeoutMs: options.localProbeTimeoutMs ?? 7000,
    toktrackLocalRunnerVersionCheckTimeoutMs: options.localVersionCheckTimeoutMs ?? 7000,
    toktrackLocalRunnerImportTimeoutMs: 60000,
    toktrackPackageRunnerProbeTimeoutMs: 45000,
    toktrackPackageRunnerVersionCheckTimeoutMs: 45000,
    toktrackPackageRunnerImportTimeoutMs: 60000,
    toktrackLatestLookupTimeoutMs: options.latestLookupTimeoutMs ?? 15000,
    toktrackLatestCacheSuccessTtlMs: 5 * 60 * 1000,
    toktrackLatestCacheFailureTtlMs: 60 * 1000,
    probeLog: (message: string) => console.warn(message),
  })
}
