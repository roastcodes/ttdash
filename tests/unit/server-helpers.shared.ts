import { EventEmitter } from 'node:events'
import { fork } from 'node:child_process'
import { existsSync, promises as fsPromises } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { vi } from 'vitest'
import { TOKTRACK_VERSION } from '../../shared/toktrack-version.js'

const require = createRequire(import.meta.url)
const fs = require('node:fs')
const os = require('node:os')
const spawnCrossPlatform = require('cross-spawn')
const { normalizeIncomingData } = require('../../usage-normalizer.js') as {
  normalizeIncomingData: (input: unknown) => unknown
}
const { TOKTRACK_PACKAGE_NAME, TOKTRACK_PACKAGE_SPEC } =
  require('../../shared/toktrack-version.js') as {
    TOKTRACK_PACKAGE_NAME: string
    TOKTRACK_PACKAGE_SPEC: string
  }
const { createDataRuntime } = require('../../server/data-runtime.js') as {
  createDataRuntime: (options: Record<string, unknown>) => {
    paths: { npxCacheDir: string }
    getFileMutationLockDir: (filePath: string) => string
    unlinkIfExists: (filePath: string) => Promise<void>
    writeJsonAtomicAsync: (filePath: string, data: unknown) => Promise<void>
    withFileMutationLock: <T>(filePath: string, operation: () => Promise<T>) => Promise<T>
    withOrderedFileMutationLocks: <T>(
      filePaths: string[],
      operation: () => Promise<T>,
    ) => Promise<T>
    withSettingsAndDataMutationLock: <T>(operation: () => Promise<T>) => Promise<T>
    writeData: (data: unknown) => void
    _updateDataLoadStateUnlocked: (patch: unknown) => Promise<unknown>
    updateDataLoadState: (patch: unknown) => Promise<unknown>
    getPendingFileMutationLockCount: () => number
  }
}
const { isLoopbackHost } = require('../../server/runtime.js') as {
  isLoopbackHost: (host: string) => boolean
}
const { listenOnAvailablePort } = require('../../server/runtime.js') as {
  listenOnAvailablePort: (
    serverInstance: {
      once: (event: string, handler: (...args: unknown[]) => void) => unknown
      off: (event: string, handler: (...args: unknown[]) => void) => unknown
      listen: (port: number, bindHost: string) => void
    },
    port: number,
    maxPort: number,
    bindHost: string,
    log?: (message: string) => void,
    rangeStartPort?: number,
  ) => Promise<number>
}
const { createAutoImportRuntime } = require('../../server/auto-import-runtime.js') as {
  createAutoImportRuntime: (options: Record<string, unknown>) => {
    commandExists: (command: string, args?: string[]) => Promise<boolean>
    getExecutableName: (baseName: string, isWindows?: boolean) => string
    getLocalToktrackDisplayCommand: (isWindows?: boolean) => string
    getToktrackLatestLookupTimeoutMs: () => number
    getToktrackRunnerTimeouts: (runner: { method?: string | null }) => {
      probeMs: number
      versionCheckMs: number
      importMs: number
    }
    lookupLatestToktrackVersion: (timeoutMs?: number) => Promise<{
      configuredVersion: string
      latestVersion: string | null
      isLatest: boolean | null
      lookupStatus: 'ok' | 'failed'
      message?: string
    }>
    resetLatestToktrackVersionCache: () => void
    parseToktrackVersionOutput: (output: string) => string
    resolveToktrackRunner: () => Promise<{
      command: string
      prefixArgs: string[]
      env: NodeJS.ProcessEnv
      method: string
      label: string
      displayCommand: string
    } | null>
    toAutoImportRunnerResolutionError: (resolution: {
      localVersionMismatch: { detectedVersion: string; expectedVersion: string } | null
      localFailure: string | null
      runnerFailures: Array<{
        label: string
        message: string
        timedOut: boolean
      }>
    }) => Error & {
      messageKey?: string
      messageVars?: Record<string, string | number>
    }
    runToktrack: (
      runner: {
        command: string
        prefixArgs: string[]
        env: NodeJS.ProcessEnv
      },
      args: string[],
      options?: {
        signalOnClose?: (close: () => void) => void
        timeoutMs?: number | null
      },
    ) => Promise<string>
    runCommandWithSpawn: (
      command: string,
      args: string[],
      options?: {
        env?: NodeJS.ProcessEnv
        streamStderr?: boolean
        onStderr?: (line: string) => void
        signalOnClose?: (close: () => void) => void
        timeoutMs?: number | null
        spawnImpl?: (
          command: string,
          args: string[],
          options: { stdio: string[]; env: NodeJS.ProcessEnv },
        ) => EventEmitter & {
          stdout: EventEmitter
          stderr: EventEmitter
          exitCode: number | null
          kill: (signal: string) => void
        }
      },
    ) => Promise<string>
  }
}

const dataRuntime = createDataRuntime({
  fs,
  fsPromises,
  os,
  path,
  processObject: process,
  normalizeIncomingData,
  runtimeInstanceId: `test-${process.pid}`,
  appDirName: 'TTDash',
  appDirNameLinux: 'ttdash',
  legacyDataFile: path.join(process.cwd(), 'data.json'),
  settingsBackupKind: 'ttdash-settings-backup',
  usageBackupKind: 'ttdash-usage-backup',
  isWindows: process.platform === 'win32',
  secureDirMode: 0o700,
  secureFileMode: 0o600,
  fileMutationLockTimeoutMs: 10_000,
  fileMutationLockStaleMs: 30_000,
})
const autoImportRuntime = createAutoImportRuntime({
  fs,
  processObject: process,
  spawnCrossPlatform,
  normalizeIncomingData,
  withSettingsAndDataMutationLock: dataRuntime.withSettingsAndDataMutationLock,
  writeData: dataRuntime.writeData,
  updateDataLoadState: dataRuntime._updateDataLoadStateUnlocked,
  toktrackPackageName: TOKTRACK_PACKAGE_NAME,
  toktrackPackageSpec: TOKTRACK_PACKAGE_SPEC,
  toktrackVersion: TOKTRACK_VERSION,
  toktrackLocalBin: path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'toktrack.cmd' : 'toktrack',
  ),
  npxCacheDir: dataRuntime.paths.npxCacheDir,
  isWindows: process.platform === 'win32',
  processTerminationGraceMs: 1000,
  toktrackLocalRunnerProbeTimeoutMs: 7000,
  toktrackLocalRunnerVersionCheckTimeoutMs: 7000,
  toktrackLocalRunnerImportTimeoutMs: 60000,
  toktrackPackageRunnerProbeTimeoutMs: 45000,
  toktrackPackageRunnerVersionCheckTimeoutMs: 45000,
  toktrackPackageRunnerImportTimeoutMs: 60000,
  toktrackLatestLookupTimeoutMs: 15000,
  toktrackLatestCacheSuccessTtlMs: 5 * 60 * 1000,
  toktrackLatestCacheFailureTtlMs: 60 * 1000,
})
const {
  commandExists,
  getExecutableName,
  getLocalToktrackDisplayCommand,
  getToktrackLatestLookupTimeoutMs,
  getToktrackRunnerTimeouts,
  lookupLatestToktrackVersion,
  resetLatestToktrackVersionCache,
  parseToktrackVersionOutput,
  resolveToktrackRunner,
  toAutoImportRunnerResolutionError,
  runToktrack,
  runCommandWithSpawn,
} = autoImportRuntime
const {
  getFileMutationLockDir,
  unlinkIfExists,
  writeJsonAtomicAsync,
  withFileMutationLock,
  withOrderedFileMutationLocks,
  getPendingFileMutationLockCount,
} = dataRuntime

export {
  EventEmitter,
  TOKTRACK_VERSION,
  commandExists,
  createAutoImportRuntime,
  existsSync,
  fork,
  fsPromises,
  getExecutableName,
  getFileMutationLockDir,
  getLocalToktrackDisplayCommand,
  getPendingFileMutationLockCount,
  getToktrackLatestLookupTimeoutMs,
  getToktrackRunnerTimeouts,
  isLoopbackHost,
  listenOnAvailablePort,
  lookupLatestToktrackVersion,
  parseToktrackVersionOutput,
  path,
  resolveToktrackRunner,
  runCommandWithSpawn,
  runToktrack,
  tmpdir,
  toAutoImportRunnerResolutionError,
  unlinkIfExists,
  withFileMutationLock,
  withOrderedFileMutationLocks,
  writeJsonAtomicAsync,
}

export function resetServerHelperTestState() {
  vi.restoreAllMocks()
  resetLatestToktrackVersionCache()
}

export function createFakeServer(
  onListen: (port: number, bindHost: string, emitter: EventEmitter) => void,
) {
  const emitter = new EventEmitter()

  return {
    once(event: string, handler: (...args: unknown[]) => void) {
      emitter.once(event, handler)
      return this
    },
    off(event: string, handler: (...args: unknown[]) => void) {
      emitter.off(event, handler)
      return this
    },
    listen(port: number, bindHost: string) {
      onListen(port, bindHost, emitter)
    },
  }
}

export async function writeExecutableScript(
  dir: string,
  name: string,
  contents: string,
): Promise<string> {
  const filePath = path.join(dir, name)
  await fsPromises.writeFile(filePath, `#!/bin/sh\n${contents}\n`, {
    mode: 0o755,
  })
  await fsPromises.chmod(filePath, 0o755)
  return filePath
}
