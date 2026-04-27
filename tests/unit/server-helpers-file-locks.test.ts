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
    getFileMutationLockDir: (filePath: string) => string
    withFileMutationLock: <T>(filePath: string, operation: () => Promise<T>) => Promise<T>
  }
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
        instanceId: 'stale-instance',
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
  await new Promise((resolve) => setTimeout(resolve, 250))
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

      const startedAt = Date.now()
      await withFileMutationLock(targetFile, async () => undefined)
      const waitedMs = Date.now() - startedAt

      expect(waitedMs).toBeGreaterThanOrEqual(150)

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

  it('swallows missing-file deletes but rethrows other unlink failures', async () => {
    await expect(unlinkIfExists('/tmp/does-not-exist.json')).resolves.toBeUndefined()

    const permissionError = Object.assign(new Error('permission denied'), { code: 'EACCES' })
    const unlinkSpy = vi.spyOn(fsPromises, 'unlink').mockRejectedValue(permissionError)

    await expect(unlinkIfExists('/tmp/protected.json')).rejects.toBe(permissionError)

    unlinkSpy.mockRestore()
  })
})
