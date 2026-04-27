import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { formatDateTime } = require('../../server/process-utils.js') as {
  formatDateTime: (value: string | number | Date, locale?: string) => string
}

describe('process utilities', () => {
  it('formats valid timestamps and returns an empty fallback for invalid dates', () => {
    expect(formatDateTime('2026-04-27T12:00:00Z', 'en-US')).toContain('4/27/26')
    expect(formatDateTime('not-a-date')).toBe('')
  })
})
