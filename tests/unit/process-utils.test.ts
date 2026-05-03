import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { formatDateTime, isProcessRunning, sleep } = require('../../server/process-utils.js') as {
  formatDateTime: (value: string | number | Date, locale?: string) => string
  isProcessRunning: (pid: number, processObject?: Pick<NodeJS.Process, 'kill'>) => boolean
  sleep: (durationMs: number) => Promise<void>
}

describe('process utilities', () => {
  it('formats valid timestamps and returns an empty fallback for invalid dates', () => {
    expect(formatDateTime('2026-04-27T12:00:00Z', 'en-US')).toContain('4/27/26')
    expect(formatDateTime('not-a-date')).toBe('')
  })

  it('detects running, missing, and permission-protected processes', () => {
    expect(isProcessRunning(0)).toBe(false)
    expect(isProcessRunning(-1)).toBe(false)
    expect(isProcessRunning(123, { kill: vi.fn() })).toBe(true)
    expect(
      isProcessRunning(123, {
        kill: vi.fn(() => {
          throw Object.assign(new Error('missing'), { code: 'ESRCH' })
        }),
      }),
    ).toBe(false)
    expect(
      isProcessRunning(123, {
        kill: vi.fn(() => {
          throw Object.assign(new Error('permission denied'), { code: 'EPERM' })
        }),
      }),
    ).toBe(true)
  })

  it('resolves sleep after the requested timer duration', async () => {
    vi.useFakeTimers()

    try {
      let settled = false
      const sleepPromise = sleep(250).then(() => {
        settled = true
      })

      await vi.advanceTimersByTimeAsync(249)
      expect(settled).toBe(false)

      await vi.advanceTimersByTimeAsync(1)
      await sleepPromise
      expect(settled).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
