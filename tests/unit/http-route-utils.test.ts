import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { getErrorMessage, sendSSE } = require('../../server/routes/http-route-utils.js') as {
  getErrorMessage: (error: unknown, fallback: string) => string
  sendSSE: (
    res: { write: (chunk: string) => void },
    event: string,
    data: unknown,
    logger?: { error: (...args: unknown[]) => void },
  ) => void
}

describe('HTTP route utilities', () => {
  it('normalizes route error messages through the shared server formatter', () => {
    expect(getErrorMessage(' plain failure ', 'fallback')).toBe('plain failure')
    expect(getErrorMessage({ code: 'E_TTDASH' }, 'fallback')).toBe('{"code":"E_TTDASH"}')
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
  })

  it('uses an injected logger when SSE payload serialization fails', () => {
    const circular: { self?: unknown } = {}
    circular.self = circular
    const logger = { error: vi.fn() }
    const res = { write: vi.fn() }

    sendSSE(res, 'broken', circular, logger)

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to serialize SSE payload for event "broken":',
      expect.any(TypeError),
    )
    expect(res.write).toHaveBeenCalledWith(
      'event: broken\ndata: {"message":"Serialization error","event":"broken"}\n\n',
    )
  })

  it('replaces unsafe SSE event names before writing a frame', () => {
    const logger = { error: vi.fn() }
    const res = { write: vi.fn() }

    sendSSE(res, 'bad\nevent', { ok: true }, logger)

    expect(logger.error).toHaveBeenCalledWith(
      'Invalid SSE event name "bad\nevent". Falling back to "invalid_event".',
    )
    expect(res.write).toHaveBeenCalledWith('event: invalid_event\ndata: {"ok":true}\n\n')
  })
})
