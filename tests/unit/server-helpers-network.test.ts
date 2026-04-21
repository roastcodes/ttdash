import { afterEach, describe, expect, it } from 'vitest'
import {
  createFakeServer,
  isLoopbackHost,
  listenOnAvailablePort,
  resetServerHelperTestState,
} from './server-helpers.shared'

afterEach(() => {
  resetServerHelperTestState()
})

describe('server helper utilities: networking', () => {
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
