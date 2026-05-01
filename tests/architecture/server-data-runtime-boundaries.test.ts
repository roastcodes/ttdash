import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

const dataRuntimeServiceFiles = [
  'server/data-runtime/app-paths.js',
  'server/data-runtime/file-io.js',
  'server/data-runtime/file-locks.js',
  'server/data-runtime/import-merge.js',
]

const forbiddenRuntimeImports = [
  '../http-router',
  '../routes/',
  '../auto-import-runtime',
  '../background-runtime',
]

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createForbiddenImportPattern(importPath: string) {
  const escapedPath = escapeRegex(importPath)

  return new RegExp(
    String.raw`(?:require\s*\(\s*['"]${escapedPath}(?=(?:['"/]|$))|from\s*['"]${escapedPath}(?=(?:['"/]|$)))`,
  )
}

describe('server data runtime boundary contract', () => {
  it('keeps data-runtime.js as the persistence composition facade', () => {
    const source = readRepoFile('server/data-runtime.js')

    expect(source).toContain("require('./data-runtime/app-paths')")
    expect(source).toContain("require('./data-runtime/file-io')")
    expect(source).toContain("require('./data-runtime/file-locks')")
    expect(source).toContain("require('./data-runtime/import-merge')")
    expect(source).toContain('function createDataRuntime')
  })

  it('keeps data runtime services independent from HTTP and other runtime modules', () => {
    for (const serviceFile of dataRuntimeServiceFiles) {
      const source = readRepoFile(serviceFile)

      for (const importPath of forbiddenRuntimeImports) {
        expect(source).not.toMatch(createForbiddenImportPattern(importPath))
      }
    }
  })
})
