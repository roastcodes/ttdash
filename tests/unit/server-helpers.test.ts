import { EventEmitter } from 'node:events'
import { fork } from 'node:child_process'
import { existsSync, promises as fsPromises } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const {
  __test__: {
    commandExists,
    getExecutableName,
    getFileMutationLockDir,
    listenOnAvailablePort,
    unlinkIfExists,
    writeJsonAtomicAsync,
    withFileMutationLock,
    withOrderedFileMutationLocks,
    getPendingFileMutationLockCount,
  },
} = require('../../server.js') as {
  __test__: {
    commandExists: (command: string, args?: string[]) => Promise<boolean>
    getExecutableName: (baseName: string, isWindows?: boolean) => string
    getFileMutationLockDir: (filePath: string) => string
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
    unlinkIfExists: (filePath: string) => Promise<void>
    writeJsonAtomicAsync: (filePath: string, data: unknown) => Promise<void>
    withFileMutationLock: <T>(filePath: string, operation: () => Promise<T>) => Promise<T>
    withOrderedFileMutationLocks: <T>(
      filePaths: string[],
      operation: () => Promise<T>,
    ) => Promise<T>
    getPendingFileMutationLockCount: () => number
  }
}
const { isLoopbackHost } = require('../../server/runtime.js') as {
  isLoopbackHost: (host: string) => boolean
}

afterEach(() => {
  vi.restoreAllMocks()
})

function createFakeServer(
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

describe('server helper utilities', () => {
  it('maps executable names correctly across platforms', () => {
    expect(getExecutableName('bun', true)).toBe('bun.exe')
    expect(getExecutableName('bunx', true)).toBe('bun.exe')
    expect(getExecutableName('npx', true)).toBe('npx.cmd')
    expect(getExecutableName('toktrack', true)).toBe('toktrack')
    expect(getExecutableName('bun', false)).toBe('bun')
    expect(getExecutableName('bunx', false)).toBe('bunx')
    expect(getExecutableName('npx', false)).toBe('npx')
  })

  it('accepts common loopback host variants', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true)
    expect(isLoopbackHost('127.0.0.2')).toBe(true)
    expect(isLoopbackHost('127.255.255.255')).toBe(true)
    expect(isLoopbackHost('localhost')).toBe(true)
    expect(isLoopbackHost('::1')).toBe(true)
    expect(isLoopbackHost('[::1]')).toBe(true)
    expect(isLoopbackHost(' ::ffff:127.0.0.1 ')).toBe(true)
    expect(isLoopbackHost('::ffff:127.0.0.2')).toBe(true)
    expect(isLoopbackHost('0.0.0.0')).toBe(false)
  })

  it.runIf(process.platform === 'win32')(
    'checks npx on Windows without emitting DEP0190 warnings',
    async () => {
      const warningMessages: string[] = []
      const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(((
        warning: string | Error,
      ) => {
        warningMessages.push(typeof warning === 'string' ? warning : warning.message)
        return process
      }) as typeof process.emitWarning)

      expect(await commandExists(getExecutableName('npx'))).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(emitWarning).not.toHaveBeenCalledWith(
        expect.stringContaining('DEP0190'),
        expect.anything(),
        expect.anything(),
      )
      expect(warningMessages.join('\n')).not.toContain('DEP0190')
    },
  )

  it('retries iteratively on EADDRINUSE and logs each skipped port', async () => {
    const attempts: number[] = []
    const logs: string[] = []
    const fakeServer = createFakeServer((port, _bindHost, emitter) => {
      attempts.push(port)
      queueMicrotask(() => {
        if (port < 3002) {
          emitter.emit('error', Object.assign(new Error('busy'), { code: 'EADDRINUSE' }))
          return
        }
        emitter.emit('listening')
      })
    })

    const resolvedPort = await listenOnAvailablePort(
      fakeServer,
      3000,
      3002,
      '127.0.0.1',
      (message) => logs.push(message),
    )

    expect(resolvedPort).toBe(3002)
    expect(attempts).toEqual([3000, 3001, 3002])
    expect(logs).toEqual([
      'Port 3000 is in use, trying 3001...',
      'Port 3001 is in use, trying 3002...',
    ])
  })

  it('throws the configured range error when no free port exists', async () => {
    const fakeServer = createFakeServer((_port, _bindHost, emitter) => {
      queueMicrotask(() => {
        emitter.emit('error', Object.assign(new Error('busy'), { code: 'EADDRINUSE' }))
      })
    })

    await expect(
      listenOnAvailablePort(fakeServer, 4100, 4101, '127.0.0.1', () => undefined, 4100),
    ).rejects.toThrow('No free port found (4100-4101)')
  })

  it('rethrows non-EADDRINUSE errors unchanged', async () => {
    const permissionError = Object.assign(new Error('permission denied'), { code: 'EACCES' })
    const fakeServer = createFakeServer((_port, _bindHost, emitter) => {
      queueMicrotask(() => {
        emitter.emit('error', permissionError)
      })
    })

    await expect(
      listenOnAvailablePort(fakeServer, 5200, 5201, '127.0.0.1', () => undefined, 5200),
    ).rejects.toBe(permissionError)
  })

  it('serializes operations for the same file path and cleans up locks afterwards', async () => {
    const events: string[] = []
    let releaseFirst: (() => void) | null = null

    const first = withFileMutationLock('/tmp/settings.json', async () => {
      events.push('first:start')
      await new Promise<void>((resolve) => {
        releaseFirst = () => {
          events.push('first:end')
          resolve()
        }
      })
    })

    const second = withFileMutationLock('/tmp/settings.json', async () => {
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
  })

  it('releases a file lock after errors so later operations can proceed', async () => {
    await expect(
      withFileMutationLock('/tmp/data.json', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    await expect(withFileMutationLock('/tmp/data.json', async () => 'ok')).resolves.toBe('ok')
    await vi.waitFor(() => {
      expect(getPendingFileMutationLockCount()).toBe(0)
    })
  })

  it('serializes overlapping multi-file operations in a stable order', async () => {
    const events: string[] = []
    let releaseFirst: (() => void) | null = null
    let signalFirstStarted: (() => void) | null = null
    const firstStarted = new Promise<void>((resolve) => {
      signalFirstStarted = resolve
    })

    const first = withOrderedFileMutationLocks(
      ['/tmp/settings.json', '/tmp/data.json'],
      async () => {
        events.push('first:start')
        signalFirstStarted?.()
        await new Promise<void>((resolve) => {
          releaseFirst = () => {
            events.push('first:end')
            resolve()
          }
        })
      },
    )

    await firstStarted
    expect(events).toEqual(['first:start'])

    const second = withOrderedFileMutationLocks(
      ['/tmp/data.json', '/tmp/settings.json'],
      async () => {
        events.push('second:start')
        events.push('second:end')
      },
    )

    await vi.waitFor(() => {
      expect(events).toEqual(['first:start'])
    })

    releaseFirst?.()
    await Promise.all([first, second])

    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end'])
    expect(getPendingFileMutationLockCount()).toBe(0)
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

  it('serializes file mutations across processes via the sidecar lock directory', async () => {
    const targetDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-cross-process-lock-'))
    const targetFile = path.join(targetDir, 'data.json')
    const childScriptPath = path.join(targetDir, 'lock-holder.cjs')

    await fsPromises.writeFile(
      childScriptPath,
      `
const serverPath = process.argv[2]
const filePath = process.argv[3]
process.argv = process.argv.slice(0, 2)
const { __test__: { withFileMutationLock } } = require(serverPath)

withFileMutationLock(filePath, async () => {
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

    const child = fork(childScriptPath, [path.resolve('server.js'), targetFile], {
      cwd: process.cwd(),
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    })

    await new Promise<void>((resolve, reject) => {
      child.once('message', (message) => {
        if (message === 'locked') {
          resolve()
          return
        }
        reject(new Error(`Unexpected child message: ${String(message)}`))
      })
      child.once('error', reject)
      child.once('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Lock holder exited early with code ${code}`))
        }
      })
    })

    const startedAt = Date.now()
    await withFileMutationLock(targetFile, async () => undefined)
    const waitedMs = Date.now() - startedAt

    expect(waitedMs).toBeGreaterThanOrEqual(150)

    if (child.exitCode === null) {
      await new Promise<void>((resolve, reject) => {
        child.once('exit', (code) => {
          if (code === 0) {
            resolve()
            return
          }
          reject(new Error(`Lock holder exited with code ${code}`))
        })
        child.once('error', reject)
      })
    } else {
      expect(child.exitCode).toBe(0)
    }

    await fsPromises.rm(targetDir, { recursive: true, force: true })
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
