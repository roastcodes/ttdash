import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { parseTrustedHosts } = require('../../server/docker-runtime.js') as {
  parseTrustedHosts: (value?: string, options?: { dockerMode?: boolean }) => string[]
}

describe('Docker runtime configuration', () => {
  it('adds safe loopback defaults and exact configured hosts in Docker mode', () => {
    expect(parseTrustedHosts('Dashboard.Example, 192.0.2.10', { dockerMode: true })).toEqual([
      'localhost',
      '127.0.0.1',
      '::1',
      'dashboard.example',
      '192.0.2.10',
    ])
  })

  it('does not add Docker defaults outside Docker mode', () => {
    expect(parseTrustedHosts('dashboard.example')).toEqual(['dashboard.example'])
  })

  it.each(['https://dashboard.example', 'dashboard.example:3000', '*.example', 'bad/name'])(
    'rejects unsafe trusted-host syntax: %s',
    (value) => expect(() => parseTrustedHosts(value)).toThrow('Invalid TTDASH_TRUSTED_HOSTS'),
  )
})
