import path from 'node:path'
import { createRequire } from 'node:module'
import { vi } from 'vitest'

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

type HeaderValue = string | number | string[]

export class MockResponse {
  status = 0
  headers: Record<string, HeaderValue> = {}
  body = ''

  setHeader(name: string, value: HeaderValue) {
    const key = name.toLowerCase()
    const previous = this.headers[key]

    if (previous === undefined) {
      this.headers[key] = value
      return
    }

    const previousValues = Array.isArray(previous) ? previous : [String(previous)]
    const nextValues = Array.isArray(value) ? value.map(String) : [String(value)]
    this.headers[key] = [...previousValues, ...nextValues]
  }

  writeHead(status: number, headers: Record<string, HeaderValue>) {
    this.status = status
    const normalizedHeaders = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
    )
    this.headers = { ...this.headers, ...normalizedHeaders }
  }

  getHeader(name: string) {
    return this.headers[name.toLowerCase()]
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

export function createValidUsageData() {
  return {
    daily: [{ date: '2026-04-27' }],
    totals: {
      inputTokens: 60,
      outputTokens: 20,
      cacheCreationTokens: 5,
      cacheReadTokens: 10,
      thinkingTokens: 5,
      totalCost: 1,
      totalTokens: 100,
      requestCount: 2,
    },
  }
}

export function createRouter({
  autoImportRuntimeOverrides = {},
  dataRuntimeOverrides = {},
  generatePdfReport = vi.fn(async () => ({
    buffer: Buffer.from(''),
    filename: 'test.pdf',
  })),
  getRuntimeSnapshot = vi.fn(() => ({
    id: 'runtime-1',
    mode: 'foreground',
    port: 3000,
    url: 'http://127.0.0.1:3000',
  })),
  httpUtilsOverrides = {},
  prepareHtmlResponse,
  readBody = vi.fn(async () => ({})),
  readFile = vi.fn(),
  remoteAuthOverrides = {},
  securityHeaders = { 'X-Test-Security': '1' },
  staticRoot = '/app/dist',
}: {
  autoImportRuntimeOverrides?: Record<string, unknown>
  dataRuntimeOverrides?: Record<string, unknown>
  generatePdfReport?: () => Promise<{ buffer: Buffer; filename: string }>
  getRuntimeSnapshot?: () => unknown
  httpUtilsOverrides?: Record<string, unknown>
  prepareHtmlResponse?: (html: string) => { body: string; headers: Record<string, string> }
  readBody?: () => Promise<unknown>
  readFile?: (filePath: string) => Promise<Buffer>
  remoteAuthOverrides?: Record<string, unknown>
  securityHeaders?: Record<string, string>
  staticRoot?: string
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
        skippedDays: 0,
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
    fs: { promises: { readFile } },
    path,
    prepareHtmlResponse,
    staticRoot,
    securityHeaders,
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

export async function requestRaw(
  router: ReturnType<typeof createRouter>['router'],
  url: string,
  method: string,
  headers: Record<string, string> = { 'content-type': 'application/json' },
) {
  const res = new MockResponse()
  const req = {
    url,
    method,
    headers,
    on: vi.fn(),
  }
  await router.handleServerRequest(req, res)
  return { req, res }
}

export async function request(
  router: ReturnType<typeof createRouter>['router'],
  url: string,
  method: string,
  headers: Record<string, string> = { 'content-type': 'application/json' },
) {
  const { res } = await requestRaw(router, url, method, headers)
  try {
    return { res, body: JSON.parse(res.body) }
  } catch {
    throw new Error(
      `Failed to parse JSON response (status=${res.status}): ${res.body.slice(0, 200)}`,
    )
  }
}
