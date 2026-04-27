import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { createExclusiveRuntimeLease, createExpiringAsyncCache, createServerRuntimeState } =
  require('../../server/runtime-state.js') as {
    createExclusiveRuntimeLease: (options: { createAlreadyRunningError: () => Error }) => {
      acquire: () => { release: () => void }
      isActive: () => boolean
    }
    createExpiringAsyncCache: <T, Args extends unknown[]>(options: {
      load: (...args: Args) => Promise<T>
      getTtlMs: (value: T) => number
      now?: () => number
    }) => {
      lookup: (...args: Args) => Promise<T>
      reset: () => void
    }
    createServerRuntimeState: (options: {
      id: string
      pid: number
      startedAt: string
      mode: string
    }) => {
      getRuntimeInstance: () => { id: string; pid: number; startedAt: string; mode: string }
      getSnapshot: () => { id: string; mode: string; port: number | null; url: string | null }
      isStartupAutoLoadCompleted: () => boolean
      markStartupAutoLoadCompleted: () => void
      setListening: (state: { port: number; url: string }) => void
    }
  }

describe('server runtime state services', () => {
  it('keeps runtime metadata, listening state, and startup flags behind a local service', () => {
    const runtimeState = createServerRuntimeState({
      id: 'runtime-1',
      pid: 1234,
      startedAt: '2026-04-26T00:00:00.000Z',
      mode: 'foreground',
    })

    expect(runtimeState.getSnapshot()).toEqual({
      id: 'runtime-1',
      mode: 'foreground',
      port: null,
      url: null,
    })
    expect(runtimeState.isStartupAutoLoadCompleted()).toBe(false)

    runtimeState.setListening({ port: 3010, url: 'http://127.0.0.1:3010' })
    runtimeState.markStartupAutoLoadCompleted()

    expect(runtimeState.getRuntimeInstance()).toEqual({
      id: 'runtime-1',
      pid: 1234,
      startedAt: '2026-04-26T00:00:00.000Z',
      mode: 'foreground',
    })
    expect(runtimeState.getSnapshot()).toEqual({
      id: 'runtime-1',
      mode: 'foreground',
      port: 3010,
      url: 'http://127.0.0.1:3010',
    })
    expect(runtimeState.isStartupAutoLoadCompleted()).toBe(true)
  })

  it('guards singleton runtime work with an idempotent lease', () => {
    const alreadyRunningError = Object.assign(new Error('already running'), {
      messageKey: 'autoImportRunning',
    })
    const leaseGuard = createExclusiveRuntimeLease({
      createAlreadyRunningError: () => alreadyRunningError,
    })

    const lease = leaseGuard.acquire()

    expect(leaseGuard.isActive()).toBe(true)
    expect(() => leaseGuard.acquire()).toThrow('already running')

    lease.release()
    lease.release()

    expect(leaseGuard.isActive()).toBe(false)
    leaseGuard.acquire().release()
    expect(leaseGuard.isActive()).toBe(false)
  })

  it('deduplicates in-flight async cache lookups and reuses values until their TTL expires', async () => {
    const now = vi.fn(() => 1000)
    const requestedLabels: string[] = []
    let resolveLookup: (value: { status: 'ok' | 'failed'; value: string }) => void = () => {}
    const load = vi.fn((label: string) => {
      requestedLabels.push(label)
      return new Promise<{ status: 'ok' | 'failed'; value: string }>((resolve) => {
        resolveLookup = resolve
      })
    })
    const cache = createExpiringAsyncCache({
      load,
      getTtlMs: (value) => (value.status === 'ok' ? 100 : 10),
      now,
    })

    const firstLookup = cache.lookup('first')
    const secondLookup = cache.lookup('second')

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith('first')
    expect(requestedLabels).toEqual(['first'])

    resolveLookup({ status: 'ok', value: 'fresh-value' })

    await expect(firstLookup).resolves.toEqual({ status: 'ok', value: 'fresh-value' })
    await expect(secondLookup).resolves.toEqual({ status: 'ok', value: 'fresh-value' })

    now.mockReturnValue(1099)
    await expect(cache.lookup('cached')).resolves.toEqual({ status: 'ok', value: 'fresh-value' })
    expect(load).toHaveBeenCalledTimes(1)

    now.mockReturnValue(1101)
    const expiredLookup = cache.lookup('expired')
    resolveLookup({ status: 'failed', value: 'offline' })

    await expect(expiredLookup).resolves.toEqual({ status: 'failed', value: 'offline' })
    expect(load).toHaveBeenCalledTimes(2)
    expect(load).toHaveBeenLastCalledWith('expired')

    now.mockReturnValue(1110)
    await expect(cache.lookup('cached-failure')).resolves.toEqual({
      status: 'failed',
      value: 'offline',
    })
    expect(load).toHaveBeenCalledTimes(2)

    cache.reset()
    const resetLookup = cache.lookup('reset')
    resolveLookup({ status: 'ok', value: '2.5.1' })

    expect(load).toHaveBeenCalledTimes(3)
    expect(load).toHaveBeenLastCalledWith('reset')
    await expect(resetLookup).resolves.toEqual({ status: 'ok', value: '2.5.1' })
  })
})
