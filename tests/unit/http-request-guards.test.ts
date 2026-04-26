import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createHttpRequestGuards } = require('../../server/http-request-guards.js') as {
  createHttpRequestGuards: (args: { bindHost: string }) => {
    validateMutationRequest: (
      req: MockRequest,
      options?: { requiresJsonContentType?: boolean },
    ) => ValidationError | null
    validateRequestHost: (req: MockRequest) => ValidationError | null
  }
}

type ValidationError = {
  status: number
  message: string
}

type MockRequest = {
  headers?: Record<string, string | string[] | undefined>
  socket?: { localAddress?: string }
}

function createRequest({
  headers = {},
  localAddress = '127.0.0.1',
}: {
  headers?: Record<string, string | string[] | undefined>
  localAddress?: string
}): MockRequest {
  return {
    headers,
    socket: { localAddress },
  }
}

describe('http request guards', () => {
  it('requires loopback host headers when the bind or socket address is loopback', () => {
    const guards = createHttpRequestGuards({ bindHost: '127.0.0.1' })

    expect(
      guards.validateRequestHost(createRequest({ headers: { host: 'localhost:3000' } })),
    ).toBeNull()
    expect(
      guards.validateRequestHost(
        createRequest({
          headers: { host: 'evil.example:3000' },
          localAddress: '127.0.0.1',
        }),
      ),
    ).toEqual({
      status: 403,
      message: 'Untrusted host header',
    })
  })

  it('preserves bracketed IPv6 loopback host and origin matching', () => {
    const guards = createHttpRequestGuards({ bindHost: '::1' })
    const req = createRequest({
      headers: {
        host: '[::1]:3000',
        origin: 'http://[::1]:3000',
      },
      localAddress: '::1',
    })

    expect(guards.validateRequestHost(req)).toBeNull()
    expect(guards.validateMutationRequest(req)).toBeNull()
  })

  it('accepts configured non-loopback hosts only when the host and origin match', () => {
    const guards = createHttpRequestGuards({ bindHost: 'dashboard.example' })
    const req = createRequest({
      headers: {
        host: 'dashboard.example:3000',
        origin: 'http://dashboard.example:3000',
      },
      localAddress: '10.0.0.5',
    })

    expect(guards.validateRequestHost(req)).toBeNull()
    expect(guards.validateMutationRequest(req)).toBeNull()
  })

  it('accepts wildcard binds only for the active socket-local host', () => {
    const guards = createHttpRequestGuards({ bindHost: '0.0.0.0' })

    expect(
      guards.validateRequestHost(
        createRequest({
          headers: { host: '192.168.1.10:3000' },
          localAddress: '192.168.1.10',
        }),
      ),
    ).toBeNull()
    expect(
      guards.validateRequestHost(
        createRequest({
          headers: { host: '0.0.0.0:3000' },
          localAddress: '192.168.1.10',
        }),
      ),
    ).toEqual({
      status: 403,
      message: 'Untrusted host header',
    })
  })

  it('blocks mutation requests with missing, null, malformed, or cross-site origins', () => {
    const guards = createHttpRequestGuards({ bindHost: '127.0.0.1' })
    const invalidRequests = [
      createRequest({ headers: { host: '127.0.0.1:3000' } }),
      createRequest({
        headers: { host: '127.0.0.1:3000', origin: 'null' },
      }),
      createRequest({
        headers: { host: '127.0.0.1:3000', origin: 'not a url' },
      }),
      createRequest({
        headers: {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
          'sec-fetch-site': 'cross-site',
        },
      }),
    ]

    for (const req of invalidRequests) {
      expect(guards.validateMutationRequest(req)).toEqual({
        status: 403,
        message: 'Cross-site requests are not allowed',
      })
    }
  })

  it('keeps JSON content-type validation strict but case-insensitive', () => {
    const guards = createHttpRequestGuards({ bindHost: '127.0.0.1' })
    const sameOriginHeaders = {
      host: 'LOCALHOST:3000',
      origin: 'http://localhost:3000',
    }

    expect(
      guards.validateMutationRequest(
        createRequest({
          headers: {
            ...sameOriginHeaders,
            'content-type': 'Application/JSON; charset=utf-8',
          },
        }),
        { requiresJsonContentType: true },
      ),
    ).toBeNull()
    expect(
      guards.validateMutationRequest(createRequest({ headers: sameOriginHeaders }), {
        requiresJsonContentType: true,
      }),
    ).toEqual({
      status: 415,
      message: 'Content-Type must be application/json',
    })
  })
})
