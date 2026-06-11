import { describe, expect, it } from 'vitest'
import { MockResponse } from './http-router-test-helpers'

describe('HTTP router test helpers', () => {
  it('normalizes replacement header values to strings', () => {
    const response = new MockResponse()

    response.setHeader('X-Test', 7)
    response.setHeader('X-Test', ['alpha', '42'])
    response.writeHead(200, { 'X-Other': 3 })

    expect(response.getHeader('x-test')).toEqual(['alpha', '42'])
    expect(response.getHeader('x-other')).toBe('3')
  })
})
