import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  existsSync,
  fork,
  fsPromises,
  getFileMutationLockDir,
  getPendingFileMutationLockCount,
  path,
  resetServerHelperTestState,
  tmpdir,
  unlinkIfExists,
  withFileMutationLock,
  withOrderedFileMutationLocks,
  writeJsonAtomicAsync,
} from './server-helpers.shared'

const require = createRequire(import.meta.url)
const fs = require('node:fs')
const os = require('node:os')
const { normalizeIncomingData } = require('../../usage-normalizer.js') as {
  normalizeIncomingData: (input: unknown) => unknown
}
const { createDataRuntime } = require('../../server/data-runtime.js') as {
  createDataRuntime: (options: Record<string, unknown>) => {
    paths: { dataFile: string; settingsFile: string }
    getFileMutationLockDir: (filePath: string) => string
    migrateLegacyDataFile: (log?: (message: string) => void) => void
    readSettings: () => { lastLoadedAt?: string | null; lastLoadSource?: string | null }
    updateDataLoadState: (patch: Record<string, unknown>) => Promise<unknown>
    writeJsonAtomic: (filePath: string, data: unknown) => void
    withFileMutationLock: <T>(filePath: string, operation: () => Promise<T>) => Promise<T>
  }
}
const { createDataRuntimeFileLocks } = require('../../server/data-runtime/file-locks.js') as {
  createDataRuntimeFileLocks: (options: Record<string, unknown>) => unknown
}

afterEach(() => {
  resetServerHelperTestState()
})

function createShortTimeoutFileLockRuntime() {
  return createDataRuntime({
    fs,
    fsPromises,
    os,
    path,
    processObject: {
      ...process,
      env: process.env,
      pid: process.pid,
      platform: process.platform,
      kill: vi.fn(() => true),
    },
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
    fileMutationLockTimeoutMs: 80,
    fileMutationLockStaleMs: 10,
  })
}

function createFileModeRuntime(runtimeRoot: string, legacyDataFile: string) {
  return createDataRuntime({
    fs,
    fsPromises,
    os,
    path,
    processObject: {
      ...process,
      env: {
        ...process.env,
        TTDASH_DATA_DIR: path.join(runtimeRoot, 'data'),
        TTDASH_CONFIG_DIR: path.join(runtimeRoot, 'config'),
        TTDASH_CACHE_DIR: path.join(runtimeRoot, 'cache'),
      },
      pid: process.pid,
      platform: process.platform,
      kill: vi.fn(() => true),
    },
    normalizeIncomingData,
    runtimeInstanceId: `test-${process.pid}`,
    appDirName: 'TTDash',
    appDirNameLinux: 'ttdash',
    legacyDataFile,
    settingsBackupKind: 'ttdash-settings-backup',
    usageBackupKind: 'ttdash-usage-backup',
    isWindows: process.platform === 'win32',
    secureDirMode: 0o700,
    secureFileMode: 0o600,
    fileMutationLockTimeoutMs: 80,
    fileMutationLockStaleMs: 10,
  })
}

function getMode(filePath: string) {
  return fs.statSync(filePath).mode & 0o777
}

function waitForChildMessage(
  child: ReturnType<typeof fork>,
  timeoutMs: number,
  expectedMessage = 'locked',
) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      child.kill()
      cleanup()
      reject(new Error(`Timed out waiting for child message: ${expectedMessage}`))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timeoutId)
      child.off('message', onMessage)
      child.off('error', onError)
      child.off('exit', onExit)
    }

    const onMessage = (message: unknown) => {
      cleanup()
      if (message === expectedMessage) {
        resolve()
        return
      }
      reject(new Error(`Unexpected child message: ${String(message)}`))
    }

    const onError = (error: unknown) => {
      cleanup()
      reject(error)
    }

    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`Lock holder exited early with code ${code}`))
    }

    child.once('message', onMessage)
    child.once('error', onError)
    child.once('exit', onExit)
  })
}

function waitForChildExit(child: ReturnType<typeof fork>, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      child.kill()
      cleanup()
      reject(new Error('Timed out waiting for lock holder to exit'))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timeoutId)
      child.off('exit', onExit)
      child.off('error', onError)
    }

    const onExit = (code: number | null) => {
      cleanup()
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Lock holder exited with code ${code}`))
    }

    const onError = (error: unknown) => {
      cleanup()
      reject(error)
    }

    child.once('exit', onExit)
    child.once('error', onError)
  })
}

describe('server helper utilities: file mutation locks', () => {
  it('fails fast when required file lock runtime options are invalid', () => {
    expect(() =>
      createDataRuntimeFileLocks({
        fsPromises,
        path,
        processObject: process,
        runtimeInstanceId: '',
        isWindows: false,
        secureDirMode: 0o1000,
        secureFileMode: 0o600,
        fileMutationLockTimeoutMs: -1,
        fileMutationLockStaleMs: 30_000,
        settingsFile: '/tmp/settings.json',
        dataFile: '/tmp/data.json',
      }),
    ).toThrow('runtimeInstanceId, secureDirMode, fileMutationLockTimeoutMs')
  })

  it('serializes operations for the same file path and cleans up locks afterwards', async () => {
    const tempDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-lock-same-file-'))
    const settingsFile = path.join(tempDir, 'settings.json')
    const events: string[] = []
    let releaseFirst: (() => void) | null = null

    const first = withFileMutationLock(settingsFile, async () => {
      events.push('first:start')
      await new Promise<void>((resolve) => {
        releaseFirst = () => {
          events.push('first:end')
          resolve()
        }
      })
    })

    const second = withFileMutationLock(settingsFile, async () => {
      events.push('second:start')
      events.push('second:end')
    })

    await vi.waitFor(() => {
      expect(events).toEqual(['first:start'])
    })
    expect(getPendingFileMutationLockCount()).toBeGreaterThan(0)

    releaseFirst?.()
    await Promise.all([first, second])
    await Promise.resolve()

    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end'])
    expect(getPendingFileMutationLockCount()).toBe(0)
    await fsPromises.rm(tempDir, { recursive: true, force: true })
  })

  it('releases a file lock after errors so later operations can proceed', async () => {
    const tempDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-lock-error-'))
    const dataFile = path.join(tempDir, 'data.json')
    await expect(
      withFileMutationLock(dataFile, async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    await expect(withFileMutationLock(dataFile, async () => 'ok')).resolves.toBe('ok')
    await vi.waitFor(() => {
      expect(getPendingFileMutationLockCount()).toBe(0)
    })
    await fsPromises.rm(tempDir, { recursive: true, force: true })
  })

  it('times out in-process waiters behind a hung predecessor and releases their queue slot', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-lock-queue-timeout-'))
    const runtime = createFileModeRuntime(runtimeRoot, path.join(runtimeRoot, 'legacy-data.json'))
    let releaseFirst: (() => void) | null = null

    try {
      const first = runtime.withFileMutationLock(
        runtime.paths.dataFile,
        async () =>
          new Promise<void>((resolve) => {
            releaseFirst = resolve
          }),
      )

      await vi.waitFor(() => {
        expect(existsSync(runtime.getFileMutationLockDir(runtime.paths.dataFile))).toBe(true)
      })

      await expect(
        runtime.withFileMutationLock(runtime.paths.dataFile, async () => 'late'),
      ).rejects.toThrow('Timed out waiting for previous file mutation lock')

      releaseFirst?.()
      await first
      await expect(
        runtime.withFileMutationLock(runtime.paths.dataFile, async () => 'ok'),
      ).resolves.toBe('ok')
    } finally {
      releaseFirst?.()
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('serializes overlapping multi-file operations in a stable order', async () => {
    const tempDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-lock-ordered-'))
    const settingsFile = path.join(tempDir, 'settings.json')
    const dataFile = path.join(tempDir, 'data.json')
    const events: string[] = []
    let releaseFirst: (() => void) | null = null
    let signalFirstStarted: (() => void) | null = null
    const firstStarted = new Promise<void>((resolve) => {
      signalFirstStarted = resolve
    })

    const first = withOrderedFileMutationLocks([settingsFile, dataFile], async () => {
      events.push('first:start')
      signalFirstStarted?.()
      await new Promise<void>((resolve) => {
        releaseFirst = () => {
          events.push('first:end')
          resolve()
        }
      })
    })

    await firstStarted
    expect(events).toEqual(['first:start'])

    const second = withOrderedFileMutationLocks([dataFile, settingsFile], async () => {
      events.push('second:start')
      events.push('second:end')
    })

    await vi.waitFor(() => {
      expect(events).toEqual(['first:start'])
    })

    releaseFirst?.()
    await Promise.all([first, second])

    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end'])
    expect(getPendingFileMutationLockCount()).toBe(0)
    await fsPromises.rm(tempDir, { recursive: true, force: true })
  })

  it('reaps stale cross-process lock directories left behind by dead owners', async () => {
    const targetDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-file-lock-'))
    const targetFile = path.join(targetDir, 'settings.json')
    const lockDir = getFileMutationLockDir(targetFile)

    await fsPromises.mkdir(lockDir, { recursive: true })
    await fsPromises.writeFile(
      path.join(lockDir, 'owner.json'),
      JSON.stringify({ pid: 999_999_999, createdAt: new Date().toISOString() }),
    )

    await expect(withFileMutationLock(targetFile, async () => 'ok')).resolves.toBe('ok')
    expect(existsSync(lockDir)).toBe(false)

    await fsPromises.rm(targetDir, { recursive: true, force: true })
  })

  it('reaps old lock directories from a different runtime instance even when the pid is alive', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-lock-instance-reuse-'))
    const runtime = createFileModeRuntime(runtimeRoot, path.join(runtimeRoot, 'legacy-data.json'))
    const lockDir = runtime.getFileMutationLockDir(runtime.paths.dataFile)

    try {
      await fsPromises.mkdir(lockDir, { recursive: true })
      await fsPromises.writeFile(
        path.join(lockDir, 'owner.json'),
        JSON.stringify(
          {
            pid: process.pid,
            createdAt: new Date(Date.now() - 1000).toISOString(),
            instanceId: 'different-runtime-instance',
          },
          null,
          2,
        ),
      )

      await expect(
        runtime.withFileMutationLock(runtime.paths.dataFile, async () => 'ok'),
      ).resolves.toBe('ok')
      expect(existsSync(lockDir)).toBe(false)
    } finally {
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('does not reap stale locks while the recorded owner pid is still running', async () => {
    const runtime = createShortTimeoutFileLockRuntime()
    const targetDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-stale-pid-lock-'))
    const targetFile = path.join(targetDir, 'settings.json')
    const lockDir = runtime.getFileMutationLockDir(targetFile)

    await fsPromises.mkdir(lockDir, { recursive: true })
    await fsPromises.writeFile(
      path.join(lockDir, 'owner.json'),
      JSON.stringify({
        pid: 4242,
        createdAt: new Date(Date.now() - 60_000).toISOString(),
        instanceId: `test-${process.pid}`,
      }),
    )

    await expect(runtime.withFileMutationLock(targetFile, async () => 'ok')).rejects.toThrow(
      'Could not acquire file mutation lock',
    )
    expect(existsSync(lockDir)).toBe(true)

    await fsPromises.rm(targetDir, { recursive: true, force: true })
  })

  it('serializes file mutations across processes via the sidecar lock directory', async () => {
    const targetDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-cross-process-lock-'))
    const targetFile = path.join(targetDir, 'data.json')
    const childScriptPath = path.join(targetDir, 'lock-holder.cjs')

    await fsPromises.writeFile(
      childScriptPath,
      `
const path = require('path')
const fs = require('fs')
const fsPromises = require('fs/promises')
const os = require('os')
const dataRuntimePath = process.argv[2]
const filePath = process.argv[3]
const { createDataRuntime } = require(dataRuntimePath)

const dataRuntime = createDataRuntime({
  fs,
  fsPromises,
  os,
  path,
  processObject: process,
  normalizeIncomingData: (value) => value,
  runtimeInstanceId: 'cross-process-lock-test',
  appDirName: 'TTDash',
  appDirNameLinux: 'ttdash',
  legacyDataFile: path.join(process.cwd(), 'data.json'),
  settingsBackupKind: 'ttdash-settings-backup',
  usageBackupKind: 'ttdash-usage-backup',
  isWindows: process.platform === 'win32',
  secureDirMode: 0o700,
  secureFileMode: 0o600,
  fileMutationLockTimeoutMs: 10000,
  fileMutationLockStaleMs: 30000,
})

dataRuntime.withFileMutationLock(filePath, async () => {
  if (typeof process.send === 'function') {
    process.send('locked')
  }
  await new Promise((resolve) => {
    process.once('message', (message) => {
      if (message === 'release') {
        resolve()
      }
    })
  })
}).then(() => process.exit(0)).catch((error) => {
  console.error(error)
  process.exit(1)
})
`.trim(),
    )

    const child = fork(childScriptPath, [path.resolve('server/data-runtime.js'), targetFile], {
      cwd: process.cwd(),
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    })

    try {
      await waitForChildMessage(child, 5_000)

      let parentAcquiredLock = false
      const parentLock = withFileMutationLock(targetFile, async () => {
        parentAcquiredLock = true
      })

      await vi.waitFor(() => {
        expect(getPendingFileMutationLockCount()).toBeGreaterThan(0)
      })
      expect(parentAcquiredLock).toBe(false)

      child.send('release')
      await parentLock
      expect(parentAcquiredLock).toBe(true)

      if (child.exitCode === null) {
        await waitForChildExit(child, 5_000)
      } else {
        expect(child.exitCode).toBe(0)
      }
    } finally {
      if (child.exitCode === null) {
        child.kill()
      }
      await fsPromises.rm(targetDir, { recursive: true, force: true })
    }
  })

  it('removes temporary files when atomic async writes fail after creating the temp file', async () => {
    const targetDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-write-json-'))
    const targetFile = path.join(targetDir, 'settings.json')
    const expectedTempPath = `${targetFile}.${process.pid}.1700000000000.tmp`
    const renameError = Object.assign(new Error('rename failed'), { code: 'EXDEV' })

    const renameSpy = vi.spyOn(fsPromises, 'rename').mockRejectedValue(renameError)
    const unlinkSpy = vi.spyOn(fsPromises, 'unlink')
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000)

    await expect(writeJsonAtomicAsync(targetFile, { ok: true })).rejects.toBe(renameError)

    expect(renameSpy).toHaveBeenCalled()
    expect(unlinkSpy).toHaveBeenCalledWith(expectedTempPath)
    expect(existsSync(expectedTempPath)).toBe(false)

    renameSpy.mockRestore()
    unlinkSpy.mockRestore()
    nowSpy.mockRestore()
    await fsPromises.rm(targetDir, { recursive: true, force: true })
  })

  it('surfaces async atomic write cleanup failures with the original write error', async () => {
    const targetDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-write-json-cleanup-'))
    const targetFile = path.join(targetDir, 'settings.json')
    const renameError = Object.assign(new Error('rename failed'), { code: 'EXDEV' })
    const cleanupError = Object.assign(new Error('cleanup failed'), { code: 'EACCES' })

    const renameSpy = vi.spyOn(fsPromises, 'rename').mockRejectedValue(renameError)
    const unlinkSpy = vi.spyOn(fsPromises, 'unlink').mockRejectedValue(cleanupError)

    try {
      let caughtError: unknown
      try {
        await writeJsonAtomicAsync(targetFile, { ok: true })
      } catch (error) {
        caughtError = error
      }

      expect(caughtError).toBeInstanceOf(AggregateError)
      expect((caughtError as AggregateError).message).toContain(
        'Failed atomic JSON write and temp-file cleanup',
      )
      expect((caughtError as AggregateError).errors).toEqual([renameError, cleanupError])
    } finally {
      renameSpy.mockRestore()
      unlinkSpy.mockRestore()
      await fsPromises.rm(targetDir, { recursive: true, force: true })
    }
  })

  it('removes temporary files when atomic sync writes fail after creating the temp file', async () => {
    const targetDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-write-json-sync-'))
    const targetFile = path.join(targetDir, 'settings.json')
    const expectedTempPath = `${targetFile}.${process.pid}.1700000000002.tmp`
    const renameError = Object.assign(new Error('rename failed'), { code: 'EXDEV' })
    const runtime = createFileModeRuntime(targetDir, path.join(targetDir, 'legacy-data.json'))

    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw renameError
    })
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000002)

    try {
      expect(() => runtime.writeJsonAtomic(targetFile, { ok: true })).toThrow(renameError)

      expect(renameSpy).toHaveBeenCalledWith(expectedTempPath, targetFile)
      expect(existsSync(expectedTempPath)).toBe(false)
    } finally {
      renameSpy.mockRestore()
      nowSpy.mockRestore()
      await fsPromises.rm(targetDir, { recursive: true, force: true })
    }
  })

  it('surfaces sync atomic write cleanup failures with the original write error', async () => {
    const targetDir = await fsPromises.mkdtemp(
      path.join(tmpdir(), 'ttdash-write-json-sync-cleanup-'),
    )
    const targetFile = path.join(targetDir, 'settings.json')
    const renameError = Object.assign(new Error('rename failed'), { code: 'EXDEV' })
    const cleanupError = Object.assign(new Error('cleanup failed'), { code: 'EACCES' })
    const runtime = createFileModeRuntime(targetDir, path.join(targetDir, 'legacy-data.json'))

    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw renameError
    })
    const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
      throw cleanupError
    })

    try {
      let caughtError: unknown
      try {
        runtime.writeJsonAtomic(targetFile, { ok: true })
      } catch (error) {
        caughtError = error
      }

      expect(caughtError).toBeInstanceOf(AggregateError)
      expect((caughtError as AggregateError).message).toContain(
        'Failed atomic JSON write and temp-file cleanup',
      )
      expect((caughtError as AggregateError).errors).toEqual([renameError, cleanupError])
    } finally {
      renameSpy.mockRestore()
      unlinkSpy.mockRestore()
      await fsPromises.rm(targetDir, { recursive: true, force: true })
    }
  })

  it('removes temporary files when writeFile rejects after creating the temp file', async () => {
    const targetDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-write-json-'))
    const targetFile = path.join(targetDir, 'settings.json')
    const expectedTempPath = `${targetFile}.${process.pid}.1700000000001.tmp`
    const writeError = Object.assign(new Error('write failed'), { code: 'EIO' })
    const originalWriteFile = fsPromises.writeFile.bind(fsPromises)
    const writeSpy = vi
      .spyOn(fsPromises, 'writeFile')
      .mockImplementation(async (filePath, data) => {
        await originalWriteFile(filePath, data)
        throw writeError
      })
    const unlinkSpy = vi.spyOn(fsPromises, 'unlink')
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000001)

    await expect(writeJsonAtomicAsync(targetFile, { ok: true })).rejects.toBe(writeError)

    expect(writeSpy).toHaveBeenCalled()
    expect(unlinkSpy).toHaveBeenCalledWith(expectedTempPath)
    expect(existsSync(expectedTempPath)).toBe(false)

    writeSpy.mockRestore()
    unlinkSpy.mockRestore()
    nowSpy.mockRestore()
    await fsPromises.rm(targetDir, { recursive: true, force: true })
  })

  it.runIf(process.platform !== 'win32')(
    'normalizes parent directory permissions before async atomic writes',
    async () => {
      const targetDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-write-dir-mode-'))
      const targetFile = path.join(targetDir, 'settings.json')

      try {
        await fsPromises.chmod(targetDir, 0o755)

        await writeJsonAtomicAsync(targetFile, { ok: true })

        expect(getMode(targetDir)).toBe(0o700)
        expect(getMode(targetFile)).toBe(0o600)
      } finally {
        await fsPromises.rm(targetDir, { recursive: true, force: true })
      }
    },
  )

  it('serializes public data-load-state updates through the settings file lock', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-data-load-lock-'))
    const runtime = createFileModeRuntime(runtimeRoot, path.join(runtimeRoot, 'legacy-data.json'))
    const events: string[] = []
    let releaseFirst: (() => void) | null = null

    try {
      const first = runtime.withFileMutationLock(runtime.paths.settingsFile, async () => {
        events.push('lock:start')
        await new Promise<void>((resolve) => {
          releaseFirst = () => {
            events.push('lock:end')
            resolve()
          }
        })
      })

      await vi.waitFor(() => {
        expect(events).toEqual(['lock:start'])
      })

      const update = runtime.updateDataLoadState({
        lastLoadedAt: '2026-04-27T12:00:00.000Z',
        lastLoadSource: 'file',
      })

      await Promise.resolve()
      expect(events).toEqual(['lock:start'])

      releaseFirst?.()
      await Promise.all([first, update])

      expect(events).toEqual(['lock:start', 'lock:end'])
      expect(runtime.readSettings()).toMatchObject({
        lastLoadedAt: '2026-04-27T12:00:00.000Z',
        lastLoadSource: 'file',
      })
    } finally {
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('normalizes migrated legacy data file permissions after rename', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-legacy-rename-'))
    const legacyDataFile = path.join(runtimeRoot, 'data.json')
    const runtime = createFileModeRuntime(runtimeRoot, legacyDataFile)

    try {
      await fsPromises.writeFile(legacyDataFile, '{"daily":[]}', { mode: 0o644 })
      if (process.platform !== 'win32') {
        await fsPromises.chmod(legacyDataFile, 0o644)
      }

      runtime.migrateLegacyDataFile(vi.fn())

      expect(existsSync(runtime.paths.dataFile)).toBe(true)
      expect(existsSync(legacyDataFile)).toBe(false)
      if (process.platform !== 'win32') {
        expect(getMode(runtime.paths.dataFile)).toBe(0o600)
      }
    } finally {
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('normalizes migrated legacy data file permissions after copy fallback', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-legacy-copy-'))
    const legacyDataFile = path.join(runtimeRoot, 'data.json')
    const runtime = createFileModeRuntime(runtimeRoot, legacyDataFile)
    const renameError = Object.assign(new Error('cross-device rename'), { code: 'EXDEV' })
    const originalRenameSync = fs.renameSync.bind(fs)
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (from === legacyDataFile && to === runtime.paths.dataFile) {
        throw renameError
      }
      return originalRenameSync(from, to)
    })

    try {
      await fsPromises.writeFile(legacyDataFile, '{"daily":[]}', { mode: 0o644 })
      if (process.platform !== 'win32') {
        await fsPromises.chmod(legacyDataFile, 0o644)
      }

      runtime.migrateLegacyDataFile(vi.fn())

      expect(renameSpy).toHaveBeenCalledWith(legacyDataFile, runtime.paths.dataFile)
      expect(existsSync(runtime.paths.dataFile)).toBe(true)
      expect(existsSync(legacyDataFile)).toBe(false)
      if (process.platform !== 'win32') {
        expect(getMode(runtime.paths.dataFile)).toBe(0o600)
      }
    } finally {
      renameSpy.mockRestore()
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('treats missing legacy data during rename as already migrated when the target exists', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-legacy-race-rename-'))
    const legacyDataFile = path.join(runtimeRoot, 'data.json')
    const runtime = createFileModeRuntime(runtimeRoot, legacyDataFile)
    const logs: string[] = []
    const originalRenameSync = fs.renameSync.bind(fs)
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (from === legacyDataFile && to === runtime.paths.dataFile) {
        fs.unlinkSync(legacyDataFile)
        fs.mkdirSync(path.dirname(runtime.paths.dataFile), { recursive: true })
        fs.writeFileSync(runtime.paths.dataFile, '{"daily":[]}', { mode: 0o644 })
        if (process.platform !== 'win32') {
          fs.chmodSync(runtime.paths.dataFile, 0o644)
        }
        throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT' })
      }
      return originalRenameSync(from, to)
    })

    try {
      await fsPromises.writeFile(legacyDataFile, '{"daily":[]}', { mode: 0o644 })

      expect(() => runtime.migrateLegacyDataFile((message) => logs.push(message))).not.toThrow()

      expect(renameSpy).toHaveBeenCalledWith(legacyDataFile, runtime.paths.dataFile)
      expect(existsSync(runtime.paths.dataFile)).toBe(true)
      expect(logs).toEqual([`Existing data already migrated to ${runtime.paths.dataFile}`])
      if (process.platform !== 'win32') {
        expect(getMode(runtime.paths.dataFile)).toBe(0o600)
      }
    } finally {
      renameSpy.mockRestore()
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('treats missing legacy data during copy fallback as already migrated when the target exists', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-legacy-race-copy-'))
    const legacyDataFile = path.join(runtimeRoot, 'data.json')
    const runtime = createFileModeRuntime(runtimeRoot, legacyDataFile)
    const logs: string[] = []
    const originalRenameSync = fs.renameSync.bind(fs)
    const originalCopyFileSync = fs.copyFileSync.bind(fs)
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (from === legacyDataFile && to === runtime.paths.dataFile) {
        throw Object.assign(new Error('cross-device rename'), { code: 'EXDEV' })
      }
      return originalRenameSync(from, to)
    })
    const copySpy = vi.spyOn(fs, 'copyFileSync').mockImplementation((from, to) => {
      if (from === legacyDataFile && to === runtime.paths.dataFile) {
        fs.unlinkSync(legacyDataFile)
        fs.mkdirSync(path.dirname(runtime.paths.dataFile), { recursive: true })
        fs.writeFileSync(runtime.paths.dataFile, '{"daily":[]}', { mode: 0o644 })
        if (process.platform !== 'win32') {
          fs.chmodSync(runtime.paths.dataFile, 0o644)
        }
        throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT' })
      }
      return originalCopyFileSync(from, to)
    })

    try {
      await fsPromises.writeFile(legacyDataFile, '{"daily":[]}', { mode: 0o644 })

      expect(() => runtime.migrateLegacyDataFile((message) => logs.push(message))).not.toThrow()

      expect(renameSpy).toHaveBeenCalledWith(legacyDataFile, runtime.paths.dataFile)
      expect(copySpy).toHaveBeenCalledWith(legacyDataFile, runtime.paths.dataFile)
      expect(existsSync(runtime.paths.dataFile)).toBe(true)
      expect(logs).toEqual([`Existing data already migrated to ${runtime.paths.dataFile}`])
      if (process.platform !== 'win32') {
        expect(getMode(runtime.paths.dataFile)).toBe(0o600)
      }
    } finally {
      renameSpy.mockRestore()
      copySpy.mockRestore()
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('keeps missing legacy data migration failures visible when the target was not created', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-legacy-missing-'))
    const legacyDataFile = path.join(runtimeRoot, 'data.json')
    const runtime = createFileModeRuntime(runtimeRoot, legacyDataFile)
    const originalRenameSync = fs.renameSync.bind(fs)
    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (from === legacyDataFile && to === runtime.paths.dataFile) {
        fs.unlinkSync(legacyDataFile)
        throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT' })
      }
      return originalRenameSync(from, to)
    })

    try {
      await fsPromises.writeFile(legacyDataFile, '{"daily":[]}', { mode: 0o644 })

      expect(() => runtime.migrateLegacyDataFile(vi.fn())).toThrow('no such file')
      expect(existsSync(runtime.paths.dataFile)).toBe(false)
    } finally {
      renameSpy.mockRestore()
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('swallows missing-file deletes but rethrows other unlink failures', async () => {
    await expect(unlinkIfExists('/tmp/does-not-exist.json')).resolves.toBeUndefined()

    const permissionError = Object.assign(new Error('permission denied'), { code: 'EACCES' })
    const unlinkSpy = vi.spyOn(fsPromises, 'unlink').mockRejectedValue(permissionError)

    await expect(unlinkIfExists('/tmp/protected.json')).rejects.toBe(permissionError)

    unlinkSpy.mockRestore()
  })
})
