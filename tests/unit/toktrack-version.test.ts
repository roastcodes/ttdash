import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { TOKTRACK_PACKAGE_SPEC, TOKTRACK_VERSION } from '../../shared/toktrack-version.js'

const require = createRequire(import.meta.url)
const packageJson = require('../../package.json') as {
  dependencies?: Record<string, string>
}

describe('toktrack version constants', () => {
  it('keeps the shared pinned version aligned with package.json', () => {
    expect(TOKTRACK_VERSION).toBe(packageJson.dependencies?.toktrack)
  })

  it('builds the package spec from the shared pinned version', () => {
    expect(TOKTRACK_PACKAGE_SPEC).toBe(`toktrack@${packageJson.dependencies?.toktrack}`)
  })
})
