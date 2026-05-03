import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockResponse, createRouter } from './http-router-test-helpers'

describe('HTTP router static file handling', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to index.html when a static file is not found', async () => {
    const { router } = createRouter({
      readFile: async (filePath) => {
        if (filePath.endsWith('index.html')) {
          return Buffer.from('<!doctype html><html></html>')
        }
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      },
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/dashboard', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(200)
    expect(res.body).toContain('<!doctype html>')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('logs failed SPA fallback reads before returning a server error', async () => {
    const fallbackError = Object.assign(new Error('index missing'), { code: 'ENOENT' })
    const { router } = createRouter({
      readFile: async (filePath) => {
        if (filePath.endsWith('index.html')) {
          throw fallbackError
        }
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      },
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/dashboard', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(500)
    expect(res.headers['x-test-security']).toBe('1')
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
    const { router } = createRouter({
      readFile: async (filePath) => {
        if (filePath.endsWith('index.html')) {
          return Buffer.from('<!doctype html><html><head></head></html>')
        }
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      },
      prepareHtmlResponse: (html) => ({
        body: html.replace('</head>', '<meta name="ttdash-csp-nonce" content="nonce"></head>'),
        headers: {
          'Content-Security-Policy': "default-src 'self'; script-src 'nonce-test'",
        },
      }),
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/dashboard', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(200)
    expect(res.headers['x-test-security']).toBe('1')
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'self'; script-src 'nonce-test'",
    )
    expect(res.body).toContain('ttdash-csp-nonce')
  })

  it('returns a bad request with static security headers for null-byte paths', async () => {
    const readFile = vi.fn(async () => Buffer.from(''))
    const { router } = createRouter({ readFile })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/assets/app%00.js', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(400)
    expect(res.headers['x-test-security']).toBe('1')
    expect(JSON.parse(res.body)).toEqual({ message: 'Invalid request path' })
    expect(readFile).not.toHaveBeenCalled()
  })

  it('returns access denied with static security headers for escaped paths', async () => {
    const readFile = vi.fn(async () => Buffer.from(''))
    const { router } = createRouter({ readFile })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/..%2Fpackage.json', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(403)
    expect(res.headers['x-test-security']).toBe('1')
    expect(JSON.parse(res.body)).toEqual({ message: 'Access denied' })
    expect(readFile).not.toHaveBeenCalled()
  })

  it('returns not found for missing static assets instead of serving the SPA shell', async () => {
    const { router } = createRouter({
      readFile: async (filePath) => {
        if (filePath.endsWith('index.html')) {
          return Buffer.from('<!doctype html><html></html>')
        }
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      },
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/assets/app.js', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(404)
    expect(res.headers['x-test-security']).toBe('1')
    expect(JSON.parse(res.body)).toEqual({ message: 'Not Found' })
  })

  it('rejects directory reads instead of treating directories as static files', async () => {
    const { router } = createRouter({
      readFile: async () => {
        throw Object.assign(new Error('directory'), { code: 'EISDIR' })
      },
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/assets', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(403)
    expect(res.headers['x-test-security']).toBe('1')
    expect(JSON.parse(res.body)).toEqual({ message: 'Access denied' })
  })

  it('returns a bad request for invalid static read paths', async () => {
    const { router } = createRouter({
      readFile: async () => {
        throw Object.assign(new Error('invalid'), { code: 'ERR_INVALID_ARG_VALUE' })
      },
    })
    const res = new MockResponse()

    await router.handleServerRequest({ url: '/asset.js', method: 'GET', headers: {} }, res)

    expect(res.status).toBe(400)
    expect(res.headers['x-test-security']).toBe('1')
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
