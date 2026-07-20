import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { createBearerAuthHeader, createRemoteAuthTestToken } from '../auth-test-helpers'

const require = createRequire(import.meta.url)
const { REMOTE_AUTH_COOKIE_NAME, REMOTE_AUTH_QUERY_PARAM, createRemoteAuth } =
  require('../../server/remote-auth.js') as {
    REMOTE_AUTH_COOKIE_NAME: string
    REMOTE_AUTH_QUERY_PARAM: string
    createRemoteAuth: (args: {
      bindHost: string
      allowRemoteBind: boolean
      token?: string
      localToken?: string
      requireLocalAuth?: boolean
      tokenFactory?: () => string
      remoteSessionTokenFactory?: () => string
      now?: () => number
      secureCookies?: boolean
      trustProxy?: boolean
      remoteSessionMaxEntries?: number
      remoteSessionRateLimit?: number
      remoteSessionFailureRateLimit?: number
    }) => {
      isRequired: () => boolean
      isLocalRequired: () => boolean
      isRemoteRequired: () => boolean
      ensureConfigured: () => void
      validateApiRequest: (
        req: EventEmitter & { headers?: Record<string, string> },
      ) => { status: number; message: string; headers: Record<string, string> } | null
      resolveBootstrapResponse: (
        url: URL,
        req?: { socket?: { encrypted?: boolean } },
      ) => {
        status: number
        headers: Record<string, string>
        body: string
      } | null
      createBootstrapUrl: (url: string) => string
      getAuthorizationHeader: () => string | null
      createRemoteSessionResponse: (
        req: EventEmitter & {
          headers?: Record<string, string>
          socket?: { encrypted?: boolean; remoteAddress?: string }
        },
      ) => { status: number; headers: Record<string, string>; body?: string } | null
    }
  }

const remoteToken = createRemoteAuthTestToken()
const remoteAuthHeader = createBearerAuthHeader(remoteToken)
const localToken = 'local-token-1234567890123456'

class MockRequest extends EventEmitter {
  headers: Record<string, string> = {}
  socket: { encrypted?: boolean; remoteAddress?: string } = {}
}

function createRemoteRequiredAuth() {
  return createRemoteAuth({
    bindHost: '0.0.0.0',
    allowRemoteBind: true,
    token: remoteToken,
  })
}

describe('remote auth', () => {
  it('requires local session authentication for loopback-only servers by default', () => {
    const auth = createRemoteAuth({
      bindHost: '127.0.0.1',
      allowRemoteBind: false,
      localToken,
    })
    const req = new MockRequest()
    const authorizedRequest = new MockRequest()
    authorizedRequest.headers.authorization = createBearerAuthHeader(localToken)

    expect(auth.isRequired()).toBe(true)
    expect(auth.isLocalRequired()).toBe(true)
    expect(auth.isRemoteRequired()).toBe(false)
    expect(auth.validateApiRequest(req)).toMatchObject({ status: 401 })
    expect(auth.validateApiRequest(authorizedRequest)).toBeNull()
    expect(auth.createBootstrapUrl('http://127.0.0.1:3000')).toBe(
      `http://127.0.0.1:3000/?${REMOTE_AUTH_QUERY_PARAM}=${localToken}`,
    )
  })

  it('can disable local authentication only for explicit test harnesses', () => {
    const auth = createRemoteAuth({
      bindHost: '127.0.0.1',
      allowRemoteBind: false,
      requireLocalAuth: false,
    })

    expect(auth.isRequired()).toBe(false)
    expect(auth.validateApiRequest(new MockRequest())).toBeNull()
  })

  it('generates a local session token when none is provided', () => {
    const generatedToken = 'generated-local-token-123456789'
    const auth = createRemoteAuth({
      bindHost: '127.0.0.1',
      allowRemoteBind: false,
      tokenFactory: () => generatedToken,
    })
    const req = new MockRequest()
    req.headers.authorization = createBearerAuthHeader(generatedToken)

    expect(auth.isLocalRequired()).toBe(true)
    expect(auth.validateApiRequest(req)).toBeNull()
    expect(auth.getAuthorizationHeader()).toBe(createBearerAuthHeader(generatedToken))
  })

  it('requires a long token when remote binding is explicitly enabled', () => {
    const missingToken = createRemoteAuth({
      bindHost: '0.0.0.0',
      allowRemoteBind: true,
      token: '',
    })
    const shortToken = createRemoteAuth({
      bindHost: '0.0.0.0',
      allowRemoteBind: true,
      token: 'too-short',
    })

    expect(() => missingToken.ensureConfigured()).toThrow('TTDASH_REMOTE_TOKEN')
    expect(() => shortToken.ensureConfigured()).toThrow('at least 24 characters')
  })

  it('accepts bearer and explicit token header credentials', () => {
    const auth = createRemoteRequiredAuth()
    const bearerRequest = new MockRequest()
    bearerRequest.headers.authorization = remoteAuthHeader
    const headerRequest = new MockRequest()
    headerRequest.headers['x-ttdash-remote-token'] = remoteToken

    expect(auth.validateApiRequest(bearerRequest)).toBeNull()
    expect(auth.validateApiRequest(headerRequest)).toBeNull()
  })

  it('exchanges the remote token for an expiring HttpOnly browser session', () => {
    let currentTime = 1000
    const sessionToken = 'generated-browser-session-token-123456789'
    const auth = createRemoteAuth({
      bindHost: '0.0.0.0',
      allowRemoteBind: true,
      token: remoteToken,
      remoteSessionTokenFactory: () => sessionToken,
      now: () => currentTime,
      secureCookies: true,
    })
    const loginRequest = new MockRequest()
    loginRequest.headers.authorization = remoteAuthHeader
    loginRequest.headers.origin = 'https://dashboard.example'

    const response = auth.createRemoteSessionResponse(loginRequest)
    expect(response).toMatchObject({ status: 204, body: '' })
    expect(response?.headers['Set-Cookie']).toContain('HttpOnly')
    expect(response?.headers['Set-Cookie']).toContain('SameSite=Strict')
    expect(response?.headers['Set-Cookie']).toContain('Secure')

    const cookieRequest = new MockRequest()
    cookieRequest.headers.cookie = `${REMOTE_AUTH_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`
    expect(auth.validateApiRequest(cookieRequest)).toBeNull()

    currentTime += 12 * 60 * 60 * 1000
    expect(auth.validateApiRequest(cookieRequest)).toMatchObject({ status: 401 })
  })

  it('rejects browser-session creation with a wrong remote token', () => {
    const auth = createRemoteRequiredAuth()
    const request = new MockRequest()
    request.headers.authorization = 'Bearer wrong-token'

    expect(auth.createRemoteSessionResponse(request)).toMatchObject({ status: 401 })
  })

  it('does not infer secure cookies from a client-controlled Origin header', () => {
    const auth = createRemoteRequiredAuth()
    const request = new MockRequest()
    request.headers.authorization = remoteAuthHeader
    request.headers.origin = 'https://dashboard.example'

    const response = auth.createRemoteSessionResponse(request)
    expect(response?.headers['Set-Cookie']).not.toContain('Secure')
  })

  it('bounds remote browser sessions with oldest-first eviction', () => {
    let sessionNumber = 0
    const auth = createRemoteAuth({
      bindHost: '0.0.0.0',
      allowRemoteBind: true,
      token: remoteToken,
      remoteSessionMaxEntries: 2,
      remoteSessionRateLimit: 10,
      remoteSessionTokenFactory: () => `generated-session-token-${++sessionNumber}-123456789`,
    })
    const loginRequest = new MockRequest()
    loginRequest.headers.authorization = remoteAuthHeader
    const cookies = Array.from({ length: 3 }, () => {
      const response = auth.createRemoteSessionResponse(loginRequest)
      return response?.headers['Set-Cookie'].split(';', 1)[0] || ''
    })
    const requestWithCookie = (cookie: string) => {
      const request = new MockRequest()
      request.headers.cookie = cookie
      return request
    }

    expect(auth.validateApiRequest(requestWithCookie(cookies[0]))).toMatchObject({ status: 401 })
    expect(auth.validateApiRequest(requestWithCookie(cookies[1]))).toBeNull()
    expect(auth.validateApiRequest(requestWithCookie(cookies[2]))).toBeNull()
  })

  it('rate-limits repeated valid-token session issuance', () => {
    const auth = createRemoteAuth({
      bindHost: '0.0.0.0',
      allowRemoteBind: true,
      token: remoteToken,
      remoteSessionRateLimit: 2,
    })
    const request = new MockRequest()
    request.headers.authorization = remoteAuthHeader

    expect(auth.createRemoteSessionResponse(request)?.status).toBe(204)
    expect(auth.createRemoteSessionResponse(request)?.status).toBe(204)
    expect(auth.createRemoteSessionResponse(request)).toMatchObject({
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  })

  it('scopes session issuance rate limits by client address', () => {
    const auth = createRemoteAuth({
      bindHost: '0.0.0.0',
      allowRemoteBind: true,
      token: remoteToken,
      remoteSessionRateLimit: 1,
    })
    const firstClient = new MockRequest()
    firstClient.headers.authorization = remoteAuthHeader
    firstClient.socket.remoteAddress = '192.0.2.10'
    const secondClient = new MockRequest()
    secondClient.headers.authorization = remoteAuthHeader
    secondClient.socket.remoteAddress = '192.0.2.11'

    expect(auth.createRemoteSessionResponse(firstClient)?.status).toBe(204)
    expect(auth.createRemoteSessionResponse(firstClient)?.status).toBe(429)
    expect(auth.createRemoteSessionResponse(secondClient)?.status).toBe(204)
  })

  it('uses forwarded client addresses only with explicit proxy trust', () => {
    const createAuth = (trustProxy: boolean) =>
      createRemoteAuth({
        bindHost: '0.0.0.0',
        allowRemoteBind: true,
        token: remoteToken,
        trustProxy,
        remoteSessionRateLimit: 1,
      })
    const firstClient = new MockRequest()
    firstClient.headers.authorization = remoteAuthHeader
    firstClient.headers['x-forwarded-for'] = '192.0.2.30'
    firstClient.socket.remoteAddress = '192.0.2.1'
    const secondClient = new MockRequest()
    secondClient.headers.authorization = remoteAuthHeader
    secondClient.headers['x-forwarded-for'] = '192.0.2.31'
    secondClient.socket.remoteAddress = '192.0.2.1'

    const directAuth = createAuth(false)
    expect(directAuth.createRemoteSessionResponse(firstClient)?.status).toBe(204)
    expect(directAuth.createRemoteSessionResponse(secondClient)?.status).toBe(429)

    const proxyAuth = createAuth(true)
    expect(proxyAuth.createRemoteSessionResponse(firstClient)?.status).toBe(204)
    expect(proxyAuth.createRemoteSessionResponse(secondClient)?.status).toBe(204)
  })

  it('rate-limits invalid session credentials per client address', () => {
    const auth = createRemoteAuth({
      bindHost: '0.0.0.0',
      allowRemoteBind: true,
      token: remoteToken,
      remoteSessionFailureRateLimit: 2,
    })
    const noisyClient = new MockRequest()
    noisyClient.headers.authorization = 'Bearer wrong-token'
    noisyClient.socket.remoteAddress = '192.0.2.20'
    const otherClient = new MockRequest()
    otherClient.headers.authorization = 'Bearer wrong-token'
    otherClient.socket.remoteAddress = '192.0.2.21'

    expect(auth.createRemoteSessionResponse(noisyClient)?.status).toBe(401)
    expect(auth.createRemoteSessionResponse(noisyClient)?.status).toBe(401)
    expect(auth.createRemoteSessionResponse(noisyClient)).toMatchObject({
      status: 429,
      headers: { 'Retry-After': '60' },
    })
    expect(auth.createRemoteSessionResponse(otherClient)?.status).toBe(401)
  })

  it('returns a structured error when browser-session token generation fails', () => {
    const auth = createRemoteAuth({
      bindHost: '0.0.0.0',
      allowRemoteBind: true,
      token: remoteToken,
      remoteSessionTokenFactory: () => 'too-short',
    })
    const request = new MockRequest()
    request.headers.authorization = remoteAuthHeader

    expect(auth.createRemoteSessionResponse(request)).toMatchObject({
      status: 500,
      message: 'Remote session token generation failed',
    })
  })

  it('sets Secure on local bootstrap cookies when explicitly configured', () => {
    const auth = createRemoteAuth({
      bindHost: '127.0.0.1',
      allowRemoteBind: false,
      localToken,
      secureCookies: true,
    })

    const response = auth.resolveBootstrapResponse(
      new URL(`http://127.0.0.1:3000/?${REMOTE_AUTH_QUERY_PARAM}=${localToken}`),
    )
    expect(response?.headers['Set-Cookie']).toContain('Secure')
  })

  it('rejects missing, wrong, and differently sized credentials generically', () => {
    const auth = createRemoteRequiredAuth()
    const missingRequest = new MockRequest()
    const wrongRequest = new MockRequest()
    wrongRequest.headers.authorization = 'Bearer wrong-token'
    const longWrongRequest = new MockRequest()
    longWrongRequest.headers.authorization = createBearerAuthHeader(`${remoteToken}-but-wrong`)

    expect(auth.validateApiRequest(missingRequest)).toMatchObject({
      status: 401,
      message: 'Authentication required',
    })
    expect(auth.validateApiRequest(wrongRequest)).toMatchObject({
      status: 401,
      message: 'Authentication required',
    })
    expect(auth.validateApiRequest(longWrongRequest)).toMatchObject({
      status: 401,
      message: 'Authentication required',
    })
  })

  it('sets an HttpOnly cookie and strips the token from local bootstrap redirects', () => {
    const auth = createRemoteAuth({
      bindHost: '127.0.0.1',
      allowRemoteBind: false,
      localToken,
    })
    const response = auth.resolveBootstrapResponse(
      new URL(`http://127.0.0.1:3000/?view=dashboard&${REMOTE_AUTH_QUERY_PARAM}=${localToken}`),
    )

    expect(response).toMatchObject({
      status: 303,
      body: '',
    })
    expect(response?.headers.Location).toBe('/?view=dashboard')
    expect(response?.headers['Set-Cookie']).toContain(`${REMOTE_AUTH_COOKIE_NAME}=`)
    expect(response?.headers['Set-Cookie']).toContain('HttpOnly')
    expect(response?.headers['Set-Cookie']).toContain('SameSite=Strict')
  })

  it('does not convert invalid local bootstrap tokens into cookies', () => {
    const auth = createRemoteAuth({
      bindHost: '127.0.0.1',
      allowRemoteBind: false,
      localToken,
    })
    const response = auth.resolveBootstrapResponse(
      new URL(`http://127.0.0.1:3000/?${REMOTE_AUTH_QUERY_PARAM}=wrong-token`),
    )

    expect(response).toMatchObject({
      status: 401,
      body: JSON.stringify({ message: 'Authentication required' }),
    })
    expect(response?.headers['Set-Cookie']).toBeUndefined()
  })

  it('does not expose the remote bearer token through bootstrap URLs', () => {
    const auth = createRemoteRequiredAuth()

    expect(auth.createBootstrapUrl('http://192.168.1.10:3000')).toBe('http://192.168.1.10:3000')
    expect(
      auth.resolveBootstrapResponse(
        new URL(`http://192.168.1.10:3000/?${REMOTE_AUTH_QUERY_PARAM}=${remoteToken}`),
      ),
    ).toBeNull()
    expect(auth.getAuthorizationHeader()).toBe(remoteAuthHeader)
  })
})
