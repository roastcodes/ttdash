import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { REMOTE_AUTH_COOKIE_NAME, REMOTE_AUTH_QUERY_PARAM, createRemoteAuth } =
  require('../../server/remote-auth.js') as {
    REMOTE_AUTH_COOKIE_NAME: string
    REMOTE_AUTH_QUERY_PARAM: string
    createRemoteAuth: (args: { bindHost: string; allowRemoteBind: boolean; token?: string }) => {
      isRequired: () => boolean
      ensureConfigured: () => void
      validateApiRequest: (
        req: EventEmitter & { headers?: Record<string, string> },
      ) => { status: number; message: string; headers: Record<string, string> } | null
      resolveBootstrapResponse: (url: URL) => {
        status: number
        headers: Record<string, string>
        body: string
      } | null
      createBootstrapUrl: (url: string) => string
      getAuthorizationHeader: () => string | null
    }
  }

const remoteToken = 'remote-token-123456789012345'

class MockRequest extends EventEmitter {
  headers: Record<string, string> = {}
}

function createRemoteRequiredAuth() {
  return createRemoteAuth({
    bindHost: '0.0.0.0',
    allowRemoteBind: true,
    token: remoteToken,
  })
}

describe('remote auth', () => {
  it('does not require authentication for loopback-only servers', () => {
    const auth = createRemoteAuth({
      bindHost: '127.0.0.1',
      allowRemoteBind: false,
      token: '',
    })
    const req = new MockRequest()

    expect(auth.isRequired()).toBe(false)
    expect(auth.validateApiRequest(req)).toBeNull()
    expect(auth.createBootstrapUrl('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000')
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

  it('accepts bearer, explicit token header, and cookie credentials', () => {
    const auth = createRemoteRequiredAuth()
    const bearerRequest = new MockRequest()
    bearerRequest.headers.authorization = `Bearer ${remoteToken}`
    const headerRequest = new MockRequest()
    headerRequest.headers['x-ttdash-remote-token'] = remoteToken
    const cookieRequest = new MockRequest()
    cookieRequest.headers.cookie = `${REMOTE_AUTH_COOKIE_NAME}=${encodeURIComponent(remoteToken)}`

    expect(auth.validateApiRequest(bearerRequest)).toBeNull()
    expect(auth.validateApiRequest(headerRequest)).toBeNull()
    expect(auth.validateApiRequest(cookieRequest)).toBeNull()
  })

  it('rejects missing, wrong, and differently sized credentials generically', () => {
    const auth = createRemoteRequiredAuth()
    const missingRequest = new MockRequest()
    const wrongRequest = new MockRequest()
    wrongRequest.headers.authorization = 'Bearer wrong-token'
    const longWrongRequest = new MockRequest()
    longWrongRequest.headers.authorization = `Bearer ${remoteToken}-but-wrong`

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

  it('sets an HttpOnly cookie and strips the token from bootstrap redirects', () => {
    const auth = createRemoteRequiredAuth()
    const response = auth.resolveBootstrapResponse(
      new URL(`http://192.168.1.10:3000/?view=dashboard&${REMOTE_AUTH_QUERY_PARAM}=${remoteToken}`),
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

  it('does not convert invalid bootstrap tokens into cookies', () => {
    const auth = createRemoteRequiredAuth()
    const response = auth.resolveBootstrapResponse(
      new URL(`http://192.168.1.10:3000/?${REMOTE_AUTH_QUERY_PARAM}=wrong-token`),
    )

    expect(response).toMatchObject({
      status: 401,
      body: JSON.stringify({ message: 'Authentication required' }),
    })
    expect(response?.headers['Set-Cookie']).toBeUndefined()
  })

  it('provides token bootstrap and background API header helpers only in remote mode', () => {
    const auth = createRemoteRequiredAuth()

    expect(auth.createBootstrapUrl('http://192.168.1.10:3000')).toBe(
      `http://192.168.1.10:3000/?${REMOTE_AUTH_QUERY_PARAM}=${remoteToken}`,
    )
    expect(auth.getAuthorizationHeader()).toBe(`Bearer ${remoteToken}`)
  })
})
