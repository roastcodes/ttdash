import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createHttpUtils } = require('../../server/http-utils.js') as {
  createHttpUtils: (args: {
    apiPrefix: string
    maxBodySize: number
    securityHeaders: Record<string, string>
  }) => {
    readBody: (req: EventEmitter & { readableEnded?: boolean }) => Promise<unknown>
    resolveApiPath: (pathname: string) => string | null
  }
}

class MockRequest extends EventEmitter {
  readableEnded = false
}

describe('http utils', () => {
  it('only resolves paths that match the configured API prefix', () => {
    const utils = createHttpUtils({
      apiPrefix: '/custom-api',
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
})
