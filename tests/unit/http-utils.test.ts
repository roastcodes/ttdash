import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createHttpUtils } = require('../../server/http-utils.js') as {
  createHttpUtils: (args: {
    apiPrefix: string
    bindHost: string
    maxBodySize: number
    securityHeaders: Record<string, string>
  }) => {
    readBody: (req: EventEmitter & { readableEnded?: boolean }) => Promise<unknown>
    resolveApiPath: (pathname: string) => string | null
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

  it('rejects mutation requests without a trusted Origin header', () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: {},
    })
    const req = new MockRequest()
    req.headers.host = '127.0.0.1:3000'
    req.socket.localAddress = '127.0.0.1'

    expect(utils.validateMutationRequest(req)).toEqual({
      status: 403,
      message: 'Cross-site requests are not allowed',
    })
  })

  it('accepts same-origin mutation requests on loopback hosts', () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: {},
    })
    const req = new MockRequest()
    req.headers.host = '127.0.0.1:3000'
    req.headers.origin = 'http://127.0.0.1:3000'
    req.socket.localAddress = '127.0.0.1'

    expect(utils.validateRequestHost(req)).toBeNull()
    expect(utils.validateMutationRequest(req)).toBeNull()
  })

  it('accepts same-origin mutation requests when the Host header casing differs', () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: {},
    })
    const req = new MockRequest()
    req.headers.host = 'LOCALHOST:3000'
    req.headers.origin = 'http://localhost:3000'
    req.socket.localAddress = '127.0.0.1'

    expect(utils.validateRequestHost(req)).toBeNull()
    expect(utils.validateMutationRequest(req)).toBeNull()
  })

  it('rejects untrusted host headers even when the origin matches them', () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '127.0.0.1',
      maxBodySize: 1024,
      securityHeaders: {},
    })
    const req = new MockRequest()
    req.headers.host = 'evil.example:3000'
    req.headers.origin = 'http://evil.example:3000'
    req.socket.localAddress = '127.0.0.1'

    expect(utils.validateRequestHost(req)).toEqual({
      status: 403,
      message: 'Untrusted host header',
    })
  })

  it('accepts host headers that match the active local address on wildcard binds', () => {
    const utils = createHttpUtils({
      apiPrefix: '/api',
      bindHost: '0.0.0.0',
      maxBodySize: 1024,
      securityHeaders: {},
    })
    const req = new MockRequest()
    req.headers.host = '192.168.1.10:3000'
    req.headers.origin = 'http://192.168.1.10:3000'
    req.socket.localAddress = '192.168.1.10'

    expect(utils.validateRequestHost(req)).toBeNull()
    expect(utils.validateMutationRequest(req)).toBeNull()
  })
})
