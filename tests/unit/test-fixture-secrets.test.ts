import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceExtensions = new Set(['.js', '.jsx', '.json', '.md', '.ts', '.tsx'])

function collectSourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const entryPath = path.join(root, entry)
    const stats = statSync(entryPath)

    if (stats.isDirectory()) {
      return collectSourceFiles(entryPath)
    }

    return sourceExtensions.has(path.extname(entryPath)) ? [entryPath] : []
  })
}

describe('test fixture secrets', () => {
  it('does not commit secret-scanner-triggering bearer token literals in tests', () => {
    const testsRoot = path.join(process.cwd(), 'tests')
    const forbiddenLiterals = [
      ['remote-token-', '123456789012345'].join(''),
      ['Bearer ', 'remote-token'].join(''),
    ]

    const matches = collectSourceFiles(testsRoot).flatMap((filePath) => {
      const content = readFileSync(filePath, 'utf-8')
      return forbiddenLiterals
        .filter((literal) => content.includes(literal))
        .map((literal) => `${path.relative(process.cwd(), filePath)} contains ${literal}`)
    })

    expect(matches).toEqual([])
  })
})
