import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createForbiddenImportPattern } from './import-patterns'

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

const autoImportRuntimeServiceFiles = [
  'server/auto-import-runtime/messages.js',
  'server/auto-import-runtime/command-runner.js',
  'server/auto-import-runtime/toktrack-runners.js',
  'server/auto-import-runtime/latest-version.js',
  'server/auto-import-runtime/import-executor.js',
]

const forbiddenRuntimeImports = [
  '../background-runtime',
  '../data-runtime',
  '../http-router',
  '../routes/',
  '../server-lifecycle',
  '../startup-runtime',
]

describe('server auto-import runtime boundary contract', () => {
  it('matches forbidden runtime imports with extensions and subpaths', () => {
    expect("require('../background-runtime.js')").toMatch(
      createForbiddenImportPattern('../background-runtime'),
    )
    expect("from '../routes/auto-import-routes.js'").toMatch(
      createForbiddenImportPattern('../routes/'),
    )
  })

  it('keeps auto-import-runtime.js as the auto-import composition facade', () => {
    const source = readRepoFile('server/auto-import-runtime.js')

    expect(source).toContain("require('./auto-import-runtime/messages')")
    expect(source).toContain("require('./auto-import-runtime/command-runner')")
    expect(source).toContain("require('./auto-import-runtime/toktrack-runners')")
    expect(source).toContain("require('./auto-import-runtime/latest-version')")
    expect(source).toContain("require('./auto-import-runtime/import-executor')")
    expect(source).toContain('function createAutoImportRuntime')
  })

  it('keeps auto-import runtime services independent from HTTP and sibling runtimes', () => {
    for (const serviceFile of autoImportRuntimeServiceFiles) {
      const source = readRepoFile(serviceFile)

      for (const importPath of forbiddenRuntimeImports) {
        expect(source).not.toMatch(createForbiddenImportPattern(importPath))
      }
    }
  })
})
