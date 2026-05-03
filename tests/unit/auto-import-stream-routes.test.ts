import { describe, expect, it, vi } from 'vitest'
import { createRouter, request, requestRaw } from './http-router-test-helpers'

describe('auto-import stream routes', () => {
  it('streams auto-import success events and releases the acquired lease', async () => {
    const lease = { release: vi.fn() }
    const closeImport = vi.fn()
    const performAutoImport = vi.fn(async ({ onCheck, onOutput, onProgress, signalOnClose }) => {
      signalOnClose(closeImport)
      onCheck({ tool: 'toktrack', status: 'found' })
      onProgress({ key: 'startingLocalImport', vars: {} })
      onOutput('runner warning')
      return { days: 2, totalCost: 3.5 }
    })
    const { router } = createRouter({
      autoImportRuntimeOverrides: {
        acquireAutoImportLease: vi.fn(() => lease),
        performAutoImport,
      },
    })

    const { req, res } = await requestRaw(router, '/api/auto-import/stream', 'POST')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('text/event-stream')
    expect(res.body).toContain('event: check')
    expect(res.body).toContain('"status":"found"')
    expect(res.body).toContain('event: progress')
    expect(res.body).toContain('event: stderr')
    expect(res.body).toContain('runner warning')
    expect(res.body).toContain('event: success')
    expect(res.body).toContain('"totalCost":3.5')
    expect(res.body).toContain('event: done')

    const checkIndex = res.body.indexOf('event: check')
    const progressIndex = res.body.indexOf('event: progress')
    const stderrIndex = res.body.indexOf('event: stderr')
    const successIndex = res.body.indexOf('event: success')
    const doneIndex = res.body.indexOf('event: done')
    expect(checkIndex).toBeGreaterThanOrEqual(0)
    expect(progressIndex).toBeGreaterThan(checkIndex)
    expect(stderrIndex).toBeGreaterThan(progressIndex)
    expect(successIndex).toBeGreaterThan(stderrIndex)
    expect(doneIndex).toBeGreaterThan(successIndex)

    expect(performAutoImport).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'auto-import',
        lease,
      }),
    )
    expect(req.on).toHaveBeenCalledWith('close', closeImport)
    expect(lease.release).toHaveBeenCalledTimes(1)
  })

  it('maps concurrent auto-import starts to a localized conflict response', async () => {
    const { router } = createRouter({
      autoImportRuntimeOverrides: {
        acquireAutoImportLease: vi.fn(() => {
          throw Object.assign(new Error('already running'), { messageKey: 'autoImportRunning' })
        }),
        createAutoImportMessageEvent: vi.fn((key: string) => ({ key })),
        formatAutoImportMessageEvent: vi.fn(() => 'An auto-import is already running.'),
      },
    })

    const { res, body } = await request(router, '/api/auto-import/stream', 'POST')

    expect(res.status).toBe(409)
    expect(body).toEqual({ message: 'An auto-import is already running.' })
  })

  it('streams structured auto-import errors and releases the lease after failures', async () => {
    const lease = { release: vi.fn() }
    const { router } = createRouter({
      autoImportRuntimeOverrides: {
        acquireAutoImportLease: vi.fn(() => lease),
        performAutoImport: vi.fn(async () => {
          throw new Error('toktrack failed')
        }),
        toAutoImportErrorEvent: vi.fn((error: Error) => ({
          message: error.message,
        })),
      },
    })

    const { res } = await requestRaw(router, '/api/auto-import/stream', 'POST')

    expect(res.status).toBe(200)
    expect(res.body).toContain('event: error')
    expect(res.body).toContain('"message":"toktrack failed"')
    expect(res.body).toContain('event: done')
    expect(lease.release).toHaveBeenCalledTimes(1)
  })
})
