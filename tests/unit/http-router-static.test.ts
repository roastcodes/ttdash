import path from 'node:path'
import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockResponse } from './http-router-test-helpers'

const require = createRequire(import.meta.url)
const { createHttpRouter } = require('../../server/http-router.js') as {
  createHttpRouter: (options: Record<string, unknown>) => {
    handleServerRequest: (
      req: { url: string; method: string; headers: Record<string, string> },
      res: MockResponse,
    ) => Promise<void>
  }
}

function createRouter(
  readFile: (filePath: string) => Promise<Buffer>,
  prepareHtmlResponse?: (html: string) => { body: string; headers: Record<string, string> },
) {
  return createHttpRouter({
    fs: {
      promises: {
        readFile,
      },
    },
    path,
    prepareHtmlResponse,
    staticRoot: '/app/dist',
    securityHeaders: { 'X-Test-Security': '1' },
    httpUtils: {
      json: (res: MockResponse, status: number, payload: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(payload))
      },
      readBody: vi.fn(),
      resolveApiPath: () => null,
      sendBuffer: vi.fn(),
      validateMutationRequest: vi.fn(),
      validateRequestHost: () => null,
    },
    remoteAuth: {
      resolveBootstrapResponse: () => null,
      validateApiRequest: () => null,
    },
    dataRuntime: {
      extractSettingsImportPayload: vi.fn(),
      extractUsageImportPayload: vi.fn(),
      isPayloadTooLargeError: vi.fn(),
      isPersistedStateError: vi.fn(),
      mergeUsageData: vi.fn(),
      readData: vi.fn(),
      readSettings: vi.fn(),
      unlinkIfExists: vi.fn(),
      updateDataLoadState: vi.fn(),
      updateSettings: vi.fn(),
      withFileMutationLock: vi.fn(),
      withSettingsAndDataMutationLock: vi.fn(),
      writeData: vi.fn(),
      writeSettings: vi.fn(),
      normalizeSettings: vi.fn(),
      paths: {
        dataFile: '/data/data.json',
        settingsFile: '/data/settings.json',
      },
    },
    autoImportRuntime: {},
    generatePdfReport: vi.fn(),
    getRuntimeSnapshot: vi.fn(),
  })
}

describe('HTTP router static file handling', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to index.html when a static file is not found', async () => {
    const router = createRouter(async (filePath) => {
      if (filePath.endsWith('index.html')) {
        return Buffer.from('<!doctype html><html></html>')
      }
      throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/dashboard', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(200)
    expect(res.body).toContain('<!doctype html>')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('logs failed SPA fallback reads before returning a server error', async () => {
    const fallbackError = Object.assign(new Error('index missing'), { code: 'ENOENT' })
    const router = createRouter(async (filePath) => {
      if (filePath.endsWith('index.html')) {
        throw fallbackError
      }
      throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/dashboard', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(500)
    expect(JSON.parse(res.body)).toEqual({ message: 'Internal Server Error' })
    expect(consoleError).toHaveBeenCalledWith(
      'SPA fallback read failed',
      expect.objectContaining({
        error: fallbackError,
        indexPath: '/app/dist/index.html',
        safePath: '/dashboard',
        staticRoot: '/app/dist',
      }),
    )
  })

  it('preserves base security headers when preparing HTML responses', async () => {
    const router = createRouter(
      async (filePath) => {
        if (filePath.endsWith('index.html')) {
          return Buffer.from('<!doctype html><html><head></head></html>')
        }
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      },
      (html) => ({
        body: html.replace('</head>', '<meta name="ttdash-csp-nonce" content="nonce"></head>'),
        headers: {
          'Content-Security-Policy': "default-src 'self'; script-src 'nonce-test'",
        },
      }),
    )
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/dashboard', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(200)
    expect(res.headers['x-test-security']).toBe('1')
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'self'; script-src 'nonce-test'",
    )
    expect(res.body).toContain('ttdash-csp-nonce')
  })

  it('returns not found for missing static assets instead of serving the SPA shell', async () => {
    const router = createRouter(async (filePath) => {
      if (filePath.endsWith('index.html')) {
        return Buffer.from('<!doctype html><html></html>')
      }
      throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/assets/app.js', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(404)
    expect(JSON.parse(res.body)).toEqual({ message: 'Not Found' })
  })

  it('rejects directory reads instead of treating directories as static files', async () => {
    const router = createRouter(async () => {
      throw Object.assign(new Error('directory'), { code: 'EISDIR' })
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/assets', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(403)
    expect(JSON.parse(res.body)).toEqual({ message: 'Access denied' })
  })

  it('returns a bad request for invalid static read paths', async () => {
    const router = createRouter(async () => {
      throw Object.assign(new Error('invalid'), { code: 'ERR_INVALID_ARG_VALUE' })
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/asset.js', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(400)
    expect(JSON.parse(res.body)).toEqual({ message: 'Invalid request path' })
    expect(consoleError).toHaveBeenCalledWith(
      'Static file read failed',
      expect.objectContaining({
        error: expect.objectContaining({ code: 'ERR_INVALID_ARG_VALUE' }),
        reqPath: '/app/dist/asset.js',
        safePath: '/asset.js',
        staticRoot: '/app/dist',
      }),
    )
  })
})
