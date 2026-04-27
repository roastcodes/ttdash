import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { createHttpUtils } = require('../../server/http-utils.js') as {
  createHttpUtils: (args: {
    apiPrefix: string
    bindHost: string
    maxBodySize: number
    securityHeaders: Record<string, string>
  }) => {
    readBody: (req: EventEmitter & { readableEnded?: boolean }) => Promise<unknown>
    json: (
      res: MockResponse,
      status: number,
      data: unknown,
      headers?: Record<string, string>,
    ) => void
    resolveApiPath: (pathname: string) => string | null
    sendBuffer: (
      res: MockResponse,
      status: number,
      headers: Record<string, string | number>,
      buffer: Buffer,
    ) => void
    validateMutationRequest: (
      req: EventEmitter & {
        headers?: Record<string, string>
        socket?: { localAddress?: string }
      },
      options?: { requiresJsonContentType?: boolean },
    ) => { status: number; message: string } | null
    validateRequestHost: (
      req: EventEmitter & {
        headers?: Record<string, string>
        socket?: { localAddress?: string }
      },
    ) => { status: number; message: string } | null
  }
}

class MockRequest extends EventEmitter {
  readableEnded = false
  headers: Record<string, string> = {}
  socket: { localAddress?: string } = {}
  resume = vi.fn()
}

class MockResponse {
  body = ''
  headers: Record<string, string | number> = {}
  status = 0

  writeHead(status: number, headers: Record<string, string | number>) {
    this.status = status
    this.headers = headers
  }

  end(chunk?: string | Buffer) {
    this.body = chunk ? chunk.toString() : ''
  }
}

describe('http utils', () => {
  it('only resolves paths that match the configured API prefix', () => {
    const utils = createHttpUtils({
      apiPrefix: '/custom-api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: {},
    })

    expect(utils.resolveApiPath('/custom-api')).toBe('/')
    expect(utils.resolveApiPath('/custom-api/settings')).toBe('/settings')
    expect(utils.resolveApiPath('/api/settings')).toBeNull()
  })

  it('rejects body reads when the request stream closes before completion', async () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: {},
    })
    const req = new MockRequest()

    const bodyPromise = utils.readBody(req)
    req.emit('data', Buffer.from('{"broken":'))
    req.emit('close')

    await expect(bodyPromise).rejects.toThrow(
      'Request body stream closed before the payload finished',
    )
  })

  it('rejects body reads that exceed the configured payload size', async () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 4,
      securityHeaders: {},
    })
    const req = new MockRequest()

    const bodyPromise = utils.readBody(req)
    req.emit('data', Buffer.from('{"ok":true}'))

    await expect(bodyPromise).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
    expect(req.resume).toHaveBeenCalledOnce()
  })

  it('parses JSON bodies normally when the request ends cleanly', async () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: {},
    })
    const req = new MockRequest()

    const bodyPromise = utils.readBody(req)
    req.emit('data', Buffer.from('{"ok":true}'))
    req.readableEnded = true
    req.emit('end')
    req.emit('close')

    await expect(bodyPromise).resolves.toEqual({ ok: true })
  })

  it('writes JSON responses with security headers and custom overrides', () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: { 'Content-Security-Policy': "default-src 'self'" },
    })
    const res = new MockResponse()

    utils.json(res, 201, { ok: true }, { 'Cache-Control': 'no-store' })

    expect(res.status).toBe(201)
    expect(res.headers).toEqual({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Security-Policy': "default-src 'self'",
      'Cache-Control': 'no-store',
    })
    expect(res.body).toBe('{"ok":true}')
  })

  it('writes binary responses with content length and security headers', () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: { 'X-Content-Type-Options': 'nosniff' },
    })
    const res = new MockResponse()

    utils.sendBuffer(res, 200, { 'Content-Type': 'application/pdf' }, Buffer.from('pdf'))

    expect(res.status).toBe(200)
    expect(res.headers).toEqual({
      'Content-Length': 3,
      'Content-Type': 'application/pdf',
      'X-Content-Type-Options': 'nosniff',
    })
    expect(res.body).toBe('pdf')
  })

  it('keeps request guard validation available through the utils facade', () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: {},
    })
    const req = new MockRequest()
    req.headers.host = '127.0.0.1:3000'
    req.headers.origin = 'http://127.0.0.1:3000'
    req.headers['content-type'] = 'application/json'

    expect(utils.validateRequestHost(req)).toBeNull()
    expect(utils.validateMutationRequest(req, { requiresJsonContentType: true })).toBeNull()
  })
})
