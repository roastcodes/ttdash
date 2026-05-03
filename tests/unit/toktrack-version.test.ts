import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { TOKTRACK_PACKAGE_SPEC, TOKTRACK_VERSION } from '../../shared/toktrack-version.js'

const require = createRequire(import.meta.url)
const packageJson = require('../../package.json') as {
  dependencies?: Record<string, string>
}

const exactSemverPattern =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

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
    expect(getToktrackDependency()).toMatch(exactSemverPattern)
  })
})
