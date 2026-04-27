import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { createHttpRouter } = require('../../server/http-router.js') as {
  createHttpRouter: (options: Record<string, unknown>) => {
    handleServerRequest: (
      req: { url: string; method: string; headers: Record<string, string> },
      res: MockResponse,
    ) => Promise<void>
  }
}

class MockResponse {
  status = 0
  headers: Record<string, string> = {}
  body = ''

  writeHead(status: number, headers: Record<string, string>) {
    this.status = status
    this.headers = headers
  }

  end(body?: string | Buffer) {
    this.body = Buffer.isBuffer(body) ? body.toString('utf8') : (body ?? '')
  }
}

function createRouter({
  autoImportRuntimeOverrides = {},
  dataRuntimeOverrides = {},
  readBody = vi.fn(async () => ({})),
}: {
  autoImportRuntimeOverrides?: Record<string, unknown>
  dataRuntimeOverrides?: Record<string, unknown>
  readBody?: () => Promise<unknown>
} = {}) {
  const dataRuntime = {
    extractSettingsImportPayload: vi.fn(
      (payload: { settings?: unknown }) => payload.settings ?? payload,
    ),
    extractUsageImportPayload: vi.fn((payload: { data?: unknown }) => payload.data ?? payload),
    isPayloadTooLargeError: vi.fn(
      (error: { code?: string }) => error?.code === 'PAYLOAD_TOO_LARGE',
    ),
    isPersistedStateError: vi.fn(() => false),
    mergeUsageData: vi.fn((_currentData, importedData) => ({
      data: importedData,
      summary: {
        importedDays: Array.isArray(importedData?.daily) ? importedData.daily.length : 0,
        addedDays: Array.isArray(importedData?.daily) ? importedData.daily.length : 0,
        unchangedDays: 0,
        conflictingDays: 0,
        totalDays: Array.isArray(importedData?.daily) ? importedData.daily.length : 0,
      },
    })),
    normalizeIncomingData: vi.fn((payload) => payload),
    normalizeSettings: vi.fn((payload) => payload),
    readData: vi.fn(() => null),
    readSettings: vi.fn(() => ({ language: 'en' })),
    unlinkIfExists: vi.fn(),
    _updateDataLoadStateUnlocked: vi.fn(async () => undefined),
    updateDataLoadState: vi.fn(async () => undefined),
    updateSettings: vi.fn(async (body) => ({ ok: true, body })),
    withFileMutationLock: vi.fn(async (_filePath: string, operation: () => Promise<unknown>) =>
      operation(),
    ),
    withSettingsAndDataMutationLock: vi.fn(async (operation: () => Promise<unknown>) =>
      operation(),
    ),
    writeData: vi.fn(async () => undefined),
    writeSettings: vi.fn(async () => undefined),
    paths: {
      dataFile: '/data/data.json',
      settingsFile: '/data/settings.json',
    },
    ...dataRuntimeOverrides,
  }

  const router = createHttpRouter({
    fs: { promises: { readFile: vi.fn() } },
    path,
    staticRoot: '/app/dist',
    securityHeaders: { 'X-Test-Security': '1' },
    httpUtils: {
      json: (res: MockResponse, status: number, payload: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(payload))
      },
      readBody,
      resolveApiPath: (pathname: string) =>
        pathname === '/api'
          ? '/'
          : pathname.startsWith('/api/')
            ? pathname.slice('/api'.length)
            : null,
      sendBuffer: vi.fn(),
      validateMutationRequest: vi.fn(() => null),
      validateRequestHost: vi.fn(() => null),
    },
    remoteAuth: {
      resolveBootstrapResponse: () => null,
      validateApiRequest: () => null,
    },
    dataRuntime,
    autoImportRuntime: {
      lookupLatestToktrackVersion: vi.fn(async () => ({
        configuredVersion: '1.0.0',
        latestVersion: '1.0.0',
        isLatest: true,
        lookupStatus: 'ok',
      })),
      ...autoImportRuntimeOverrides,
    },
    generatePdfReport: vi.fn(),
    getRuntimeSnapshot: vi.fn(),
  })

  return { dataRuntime, readBody, router }
}

async function request(
  router: ReturnType<typeof createRouter>['router'],
  url: string,
  method: string,
) {
  const res = new MockResponse()
  await router.handleServerRequest(
    { url, method, headers: { 'content-type': 'application/json' } },
    res,
  )
  return { res, body: JSON.parse(res.body) }
}

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
    const usageData = { daily: [{ date: '2026-04-27' }], totals: { totalCost: 1 } }
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

  it('returns server errors for usage import write failures', async () => {
    const usageData = { daily: [{ date: '2026-04-27' }], totals: { totalCost: 1 } }
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

  it('returns service unavailable when toktrack version lookup throws', async () => {
    const { router } = createRouter({
      autoImportRuntimeOverrides: {
        lookupLatestToktrackVersion: vi.fn(async () => {
          throw new Error('registry unavailable')
        }),
      },
    })

    const { res, body } = await request(router, '/api/toktrack/version-status', 'GET')

    expect(res.status).toBe(503)
    expect(body).toEqual({
      message: 'Service Unavailable',
      detail: 'registry unavailable',
    })
  })
})
