import { describe, expect, it, vi } from 'vitest'
import { createRouter, request } from './http-router-test-helpers'

describe('runtime and API guard routes', () => {
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
    expect(res.headers['www-authenticate']).toBe('Bearer realm="TTDash API"')
    expect(body).toEqual({ message: 'Authentication required' })
  })

  it('serves runtime snapshots only through GET', async () => {
    const snapshot = {
      id: 'runtime-2',
      mode: 'background',
      port: 3020,
      url: 'http://localhost:3020',
    }
    const getRuntimeSnapshot = vi.fn(() => snapshot)
    const { router } = createRouter({
      getRuntimeSnapshot,
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
})
