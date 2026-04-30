import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { createHttpRouter } = require('../../server/http-router.js') as {
  createHttpRouter: (options: Record<string, unknown>) => {
    handleServerRequest: (
      req: {
        url: string
        method: string
        headers: Record<string, string>
        on?: (event: string, listener: () => void) => unknown
      },
      res: MockResponse,
    ) => Promise<void>
  }
}

class MockResponse {
  status = 0
  headers: Record<string, string | number | string[]> = {}
  body = ''

  writeHead(status: number, headers: Record<string, string | number | string[]>) {
    this.status = status
    this.headers = headers
  }

  write(body: string | Buffer) {
    this.body += Buffer.isBuffer(body) ? body.toString('utf8') : body
  }

  end(body?: string | Buffer) {
    if (body !== undefined) {
      this.body += Buffer.isBuffer(body) ? body.toString('utf8') : body
    }
  }
}

function createRouter({
  autoImportRuntimeOverrides = {},
  dataRuntimeOverrides = {},
  generatePdfReport = vi.fn(),
  getRuntimeSnapshot = vi.fn(() => ({
    id: 'runtime-1',
    mode: 'foreground',
    port: 3000,
    url: 'http://127.0.0.1:3000',
  })),
  httpUtilsOverrides = {},
  readBody = vi.fn(async () => ({})),
  remoteAuthOverrides = {},
}: {
  autoImportRuntimeOverrides?: Record<string, unknown>
  dataRuntimeOverrides?: Record<string, unknown>
  generatePdfReport?: () => Promise<{ buffer: Buffer; filename: string }>
  getRuntimeSnapshot?: () => unknown
  httpUtilsOverrides?: Record<string, unknown>
  readBody?: () => Promise<unknown>
  remoteAuthOverrides?: Record<string, unknown>
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
      json: (
        res: MockResponse,
        status: number,
        payload: unknown,
        headers: Record<string, string> = {},
      ) => {
        res.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
          ...headers,
        })
        res.end(JSON.stringify(payload))
      },
      readBody,
      resolveApiPath: (pathname: string) =>
        pathname === '/api'
          ? '/'
          : pathname.startsWith('/api/')
            ? pathname.slice('/api'.length)
            : null,
      sendBuffer: (
        res: MockResponse,
        status: number,
        headers: Record<string, string>,
        buffer: Buffer,
      ) => {
        res.writeHead(status, headers)
        res.end(buffer)
      },
      validateMutationRequest: vi.fn(() => null),
      validateRequestHost: vi.fn(() => null),
      ...httpUtilsOverrides,
    },
    remoteAuth: {
      resolveBootstrapResponse: () => null,
      validateApiRequest: () => null,
      ...remoteAuthOverrides,
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
    generatePdfReport,
    getRuntimeSnapshot,
  })

  return { dataRuntime, generatePdfReport, getRuntimeSnapshot, readBody, router }
}

async function requestRaw(
  router: ReturnType<typeof createRouter>['router'],
  url: string,
  method: string,
) {
  const res = new MockResponse()
  const req = {
    url,
    method,
    headers: { 'content-type': 'application/json' },
    on: vi.fn(),
  }
  await router.handleServerRequest(req, res)
  return { res }
}

async function request(
  router: ReturnType<typeof createRouter>['router'],
  url: string,
  method: string,
) {
  const { res } = await requestRaw(router, url, method)
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

    const { res } = await requestRaw(router, '/api/auto-import/stream', 'POST')

    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('text/event-stream')
    expect(res.body).toContain('event: check')
    expect(res.body).toContain('"status":"found"')
    expect(res.body).toContain('event: progress')
    expect(res.body).toContain('event: stderr')
    expect(res.body).toContain('runner warning')
    expect(res.body).toContain('event: success')
    expect(res.body).toContain('"totalCost":3.5')
    expect(res.body).toContain('event: done')
    expect(performAutoImport).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'auto-import',
        lease,
      }),
    )
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

  it('rejects untrusted hosts before API auth is evaluated', async () => {
    const validateApiRequest = vi.fn(() => ({
      status: 401,
      message: 'Authentication required',
    }))
    const { router } = createRouter({
      httpUtilsOverrides: {
        validateRequestHost: vi.fn(() => ({
          status: 403,
          message: 'Untrusted host header',
        })),
      },
      remoteAuthOverrides: {
        validateApiRequest,
      },
    })

    const { res, body } = await request(router, '/api/runtime', 'GET')

    expect(res.status).toBe(403)
    expect(body).toEqual({ message: 'Untrusted host header' })
    expect(validateApiRequest).not.toHaveBeenCalled()
  })

  it('forwards API authentication failures with challenge headers', async () => {
    const { router } = createRouter({
      remoteAuthOverrides: {
        validateApiRequest: vi.fn(() => ({
          headers: { 'WWW-Authenticate': 'Bearer realm="TTDash API"' },
          status: 401,
          message: 'Authentication required',
        })),
      },
    })

    const { res, body } = await request(router, '/api/runtime', 'GET')

    expect(res.status).toBe(401)
    expect(res.headers['WWW-Authenticate']).toBe('Bearer realm="TTDash API"')
    expect(body).toEqual({ message: 'Authentication required' })
  })

  it('serves runtime snapshots only through GET', async () => {
    const snapshot = {
      id: 'runtime-2',
      mode: 'background',
      port: 3020,
      url: 'http://localhost:3020',
    }
    const { getRuntimeSnapshot, router } = createRouter({
      getRuntimeSnapshot: vi.fn(() => snapshot),
    })

    const runtimeResponse = await request(router, '/api/runtime', 'GET')
    const rejectedMethod = await request(router, '/api/runtime', 'POST')

    expect(runtimeResponse.res.status).toBe(200)
    expect(runtimeResponse.body).toEqual(snapshot)
    expect(getRuntimeSnapshot).toHaveBeenCalledTimes(1)
    expect(rejectedMethod.res.status).toBe(405)
    expect(rejectedMethod.body).toEqual({ message: 'Method Not Allowed' })
  })

  it('keeps unknown API endpoints distinct from stale API prefixes', async () => {
    const { router } = createRouter({
      httpUtilsOverrides: {
        // Simulate a configured API prefix with no handler separately from a stale /api URL.
        resolveApiPath: (pathname: string) => (pathname === '/custom/unknown' ? '/unknown' : null),
      },
    })

    const unknownEndpoint = await request(router, '/custom/unknown', 'GET')
    const stalePrefix = await request(router, '/api/not-configured', 'GET')

    expect(unknownEndpoint.res.status).toBe(404)
    expect(unknownEndpoint.body).toEqual({ message: 'API endpoint not found' })
    expect(stalePrefix.res.status).toBe(404)
    expect(stalePrefix.body).toEqual({ message: 'Not Found' })
  })

  it('rejects PDF reports without usage data before reading the request body', async () => {
    const readBody = vi.fn(async () => ({ title: 'Usage' }))
    const { router } = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => null),
      },
      readBody,
    })

    const { res, body } = await request(router, '/api/report/pdf', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'No data available for the report.' })
    expect(readBody).not.toHaveBeenCalled()
  })

  it('maps PDF body and generator failures to client or service errors', async () => {
    const usageData = { daily: [{ date: '2026-04-27' }], totals: { totalCost: 1 } }
    const invalidBodyRouter = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => usageData),
      },
      readBody: vi.fn(async () => {
        throw new Error('broken report JSON')
      }),
    }).router
    const oversizedRouter = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => usageData),
      },
      readBody: vi.fn(async () => {
        throw Object.assign(new Error('too large'), { code: 'PAYLOAD_TOO_LARGE' })
      }),
    }).router
    const typstMissingRouter = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => usageData),
      },
      generatePdfReport: vi.fn(async () => {
        throw Object.assign(new Error('Typst not found'), { code: 'TYPST_MISSING' })
      }),
      readBody: vi.fn(async () => ({ locale: 'de-CH' })),
    }).router

    const invalidBody = await request(invalidBodyRouter, '/api/report/pdf', 'POST')
    const oversized = await request(oversizedRouter, '/api/report/pdf', 'POST')
    const typstMissing = await request(typstMissingRouter, '/api/report/pdf', 'POST')

    expect(invalidBody.res.status).toBe(400)
    expect(invalidBody.body).toEqual({ message: 'Invalid report request' })
    expect(oversized.res.status).toBe(413)
    expect(oversized.body).toEqual({ message: 'Report request too large' })
    expect(typstMissing.res.status).toBe(503)
    expect(typstMissing.body).toEqual({ message: 'Typst not found' })
  })

  it('sends generated PDF buffers with attachment headers', async () => {
    const usageData = { daily: [{ date: '2026-04-27' }], totals: { totalCost: 1 } }
    const generatePdfReport = vi.fn(async () => ({
      buffer: Buffer.from('%PDF-1.4'),
      filename: 'ttdash-report.pdf',
    }))
    const { router } = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => usageData),
      },
      generatePdfReport,
      readBody: vi.fn(async () => ({ locale: 'de-CH' })),
    })

    const { res } = await requestRaw(router, '/api/report/pdf', 'POST')

    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('application/pdf')
    expect(res.headers['Content-Disposition']).toBe('attachment; filename="ttdash-report.pdf"')
    expect(res.body).toBe('%PDF-1.4')
    expect(generatePdfReport).toHaveBeenCalledWith(usageData.daily, { locale: 'de-CH' })
  })
})
