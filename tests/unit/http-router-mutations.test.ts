import { describe, expect, it, vi } from 'vitest'
import { createRouter, createValidUsageData, request } from './http-router-test-helpers'

describe('HTTP router mutation errors', () => {
  it('keeps malformed settings requests as client errors', async () => {
    const { router } = createRouter({
      readBody: vi.fn(async () => {
        throw new Error('broken JSON')
      }),
    })

    const { res, body } = await request(router, '/api/settings', 'PATCH')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'broken JSON' })
  })

  it('keeps oversized settings requests as payload errors', async () => {
    const { router } = createRouter({
      readBody: vi.fn(async () => {
        throw Object.assign(new Error('too large'), { code: 'PAYLOAD_TOO_LARGE' })
      }),
    })

    const { res, body } = await request(router, '/api/settings', 'PATCH')

    expect(res.status).toBe(413)
    expect(body).toEqual({ message: 'Settings request too large' })
  })

  it('returns server errors for settings patch persistence failures', async () => {
    const { router } = createRouter({
      readBody: vi.fn(async () => ({ language: 'en' })),
      dataRuntimeOverrides: {
        updateSettings: vi.fn(async () => {
          throw Object.assign(new Error('disk full'), { code: 'ENOSPC' })
        }),
      },
    })

    const { res, body } = await request(router, '/api/settings', 'PATCH')

    expect(res.status).toBe(500)
    expect(body).toEqual({ message: 'Server error' })
  })

  it('returns server errors for usage delete persistence failures', async () => {
    const { router } = createRouter({
      dataRuntimeOverrides: {
        withSettingsAndDataMutationLock: vi.fn(async () => {
          throw Object.assign(new Error('disk full'), { code: 'ENOSPC' })
        }),
      },
    })

    const { res, body } = await request(router, '/api/usage', 'DELETE')

    expect(res.status).toBe(500)
    expect(body).toEqual({ message: 'Server error' })
  })

  it('returns server errors for settings delete persistence failures', async () => {
    const { router } = createRouter({
      dataRuntimeOverrides: {
        withFileMutationLock: vi.fn(async () => {
          throw Object.assign(new Error('permission denied'), { code: 'EACCES' })
        }),
      },
    })

    const { res, body } = await request(router, '/api/settings', 'DELETE')

    expect(res.status).toBe(500)
    expect(body).toEqual({ message: 'Server error' })
  })

  it('reads reset settings while the settings delete lock is still held', async () => {
    const events: string[] = []
    const { router } = createRouter({
      dataRuntimeOverrides: {
        readSettings: vi.fn(() => {
          events.push('readSettings')
          return { language: 'en' }
        }),
        unlinkIfExists: vi.fn(async () => {
          events.push('unlink')
        }),
        withFileMutationLock: vi.fn(
          async (_filePath: string, operation: () => Promise<unknown>) => {
            events.push('lock:start')
            const result = await operation()
            events.push('lock:end')
            return result
          },
        ),
      },
    })

    const { res, body } = await request(router, '/api/settings', 'DELETE')

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true, settings: { language: 'en' } })
    expect(events).toEqual(['lock:start', 'unlink', 'readSettings', 'lock:end'])
  })

  it('returns server errors for settings import write failures', async () => {
    const { router } = createRouter({
      readBody: vi.fn(async () => ({ settings: { language: 'en' } })),
      dataRuntimeOverrides: {
        writeSettings: vi.fn(async () => {
          throw Object.assign(new Error('permission denied'), { code: 'EACCES' })
        }),
      },
    })

    const { res, body } = await request(router, '/api/settings/import', 'POST')

    expect(res.status).toBe(500)
    expect(body).toEqual({ message: 'Server error' })
  })

  it('reads imported settings while the settings import lock is still held', async () => {
    const events: string[] = []
    const { router } = createRouter({
      readBody: vi.fn(async () => ({ settings: { language: 'de' } })),
      dataRuntimeOverrides: {
        readSettings: vi.fn(() => {
          events.push('readSettings')
          return { language: 'de' }
        }),
        writeSettings: vi.fn(async () => {
          events.push('writeSettings')
        }),
        withFileMutationLock: vi.fn(
          async (_filePath: string, operation: () => Promise<unknown>) => {
            events.push('lock:start')
            const result = await operation()
            events.push('lock:end')
            return result
          },
        ),
      },
    })

    const { res, body } = await request(router, '/api/settings/import', 'POST')

    expect(res.status).toBe(200)
    expect(body).toEqual({ language: 'de' })
    expect(events).toEqual(['lock:start', 'writeSettings', 'readSettings', 'lock:end'])
  })

  it('returns server errors for upload write failures', async () => {
    const usageData = createValidUsageData()
    const { router } = createRouter({
      readBody: vi.fn(async () => usageData),
      dataRuntimeOverrides: {
        writeData: vi.fn(async () => {
          throw Object.assign(new Error('disk full'), { code: 'ENOSPC' })
        }),
      },
    })

    const { res, body } = await request(router, '/api/upload', 'POST')

    expect(res.status).toBe(500)
    expect(body).toEqual({ message: 'Server error' })
  })

  it('rejects normalized upload payloads that are not valid usage data', async () => {
    const { dataRuntime, router } = createRouter({
      readBody: vi.fn(async () => ({ daily: [{ date: 42 }], totals: {} })),
    })

    const { res, body } = await request(router, '/api/upload', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'Invalid JSON' })
    expect(dataRuntime.writeData).not.toHaveBeenCalled()
  })

  it('rejects normalized upload payloads with partial totals', async () => {
    const { dataRuntime, router } = createRouter({
      readBody: vi.fn(async () => ({
        daily: [{ date: '2026-04-27' }],
        totals: {},
      })),
    })

    const { res, body } = await request(router, '/api/upload', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'Invalid JSON' })
    expect(dataRuntime.writeData).not.toHaveBeenCalled()
  })

  it('rejects normalized upload payloads missing detailed totals', async () => {
    const { dataRuntime, router } = createRouter({
      readBody: vi.fn(async () => ({
        daily: [{ date: '2026-04-27' }],
        totals: {
          totalCost: 1,
          totalTokens: 100,
          requestCount: 2,
        },
      })),
    })

    const { res, body } = await request(router, '/api/upload', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'Invalid JSON' })
    expect(dataRuntime.writeData).not.toHaveBeenCalled()
  })

  it('rejects normalized upload payloads with non-finite totals', async () => {
    const { dataRuntime, router } = createRouter({
      readBody: vi.fn(async () => ({
        daily: [{ date: '2026-04-27' }],
        totals: {
          inputTokens: 60,
          outputTokens: 20,
          cacheCreationTokens: 5,
          cacheReadTokens: 10,
          thinkingTokens: 5,
          totalCost: Number.POSITIVE_INFINITY,
          totalTokens: 10,
          requestCount: 1,
        },
      })),
    })

    const { res, body } = await request(router, '/api/upload', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'Invalid JSON' })
    expect(dataRuntime.writeData).not.toHaveBeenCalled()
  })

  it('returns server errors for usage import write failures', async () => {
    const usageData = createValidUsageData()
    const { router } = createRouter({
      readBody: vi.fn(async () => ({ data: usageData })),
      dataRuntimeOverrides: {
        writeData: vi.fn(async () => {
          throw Object.assign(new Error('disk full'), { code: 'ENOSPC' })
        }),
      },
    })

    const { res, body } = await request(router, '/api/usage/import', 'POST')

    expect(res.status).toBe(500)
    expect(body).toEqual({ message: 'Server error' })
  })

  it('rejects normalized usage imports that are not valid usage data', async () => {
    const { dataRuntime, router } = createRouter({
      readBody: vi.fn(async () => ({ data: { daily: [{ date: 42 }], totals: {} } })),
    })

    const { res, body } = await request(router, '/api/usage/import', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'Invalid usage backup file' })
    expect(dataRuntime.writeData).not.toHaveBeenCalled()
  })

  it('rejects normalized usage imports with partial totals', async () => {
    const { dataRuntime, router } = createRouter({
      readBody: vi.fn(async () => ({
        data: {
          daily: [{ date: '2026-04-27' }],
          totals: {},
        },
      })),
    })

    const { res, body } = await request(router, '/api/usage/import', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'Invalid usage backup file' })
    expect(dataRuntime.writeData).not.toHaveBeenCalled()
  })

  it('rejects normalized usage imports missing detailed totals', async () => {
    const { dataRuntime, router } = createRouter({
      readBody: vi.fn(async () => ({
        data: {
          daily: [{ date: '2026-04-27' }],
          totals: {
            totalCost: 1,
            totalTokens: 100,
            requestCount: 2,
          },
        },
      })),
    })

    const { res, body } = await request(router, '/api/usage/import', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'Invalid usage backup file' })
    expect(dataRuntime.writeData).not.toHaveBeenCalled()
  })

  it('rejects normalized usage imports with non-finite totals', async () => {
    const { dataRuntime, router } = createRouter({
      readBody: vi.fn(async () => ({
        data: {
          daily: [{ date: '2026-04-27' }],
          totals: {
            inputTokens: 60,
            outputTokens: 20,
            cacheCreationTokens: 5,
            cacheReadTokens: Number.NaN,
            thinkingTokens: 5,
            totalCost: 1,
            totalTokens: 100,
            requestCount: 2,
          },
        },
      })),
    })

    const { res, body } = await request(router, '/api/usage/import', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'Invalid usage backup file' })
    expect(dataRuntime.writeData).not.toHaveBeenCalled()
  })
})
