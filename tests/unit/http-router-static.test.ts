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

function createRouter(readFile: (filePath: string) => Promise<Buffer>) {
  return createHttpRouter({
    fs: {
      promises: {
        readFile,
      },
    },
    path,
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
  })
})
