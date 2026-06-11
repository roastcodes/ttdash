import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { TOKTRACK_PACKAGE_SPEC, TOKTRACK_VERSION } from '../../shared/toktrack-version.js'

const require = createRequire(import.meta.url)
const packageJson = require('../../package.json') as {
  dependencies?: Record<string, string>
}
const semver = require('semver') as {
  valid: (version: string) => string | null
}

function getToktrackDependency() {
  const version = packageJson.dependencies?.toktrack
  if (typeof version !== 'string') {
    throw new Error('package.json dependencies.toktrack must be defined.')
  }

  return version
}

describe('toktrack version constants', () => {
  it('keeps the shared pinned version aligned with package.json', () => {
    expect(TOKTRACK_VERSION).toBe(getToktrackDependency())
  })

  it('builds the package spec from the shared pinned version', () => {
    expect(TOKTRACK_PACKAGE_SPEC).toBe(`toktrack@${getToktrackDependency()}`)
  })

  it('keeps the package dependency pinned to an exact SemVer version', () => {
    const version = getToktrackDependency()

    expect(semver.valid(version)).toBe(version)
  })

  it('rejects invalid exact SemVer prerelease identifiers', () => {
    expect(semver.valid('1.0.0-01')).toBeNull()
    expect(semver.valid('1.0.0-alpha.01')).toBeNull()
    expect(semver.valid('1.0.0-')).toBeNull()
  })
})
