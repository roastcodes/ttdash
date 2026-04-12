import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  __test__: { getExecutableName, listenOnAvailablePort },
} = require('../../server.js') as {
  __test__: {
    getExecutableName: (baseName: string, isWindows?: boolean) => string
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
}

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
})
