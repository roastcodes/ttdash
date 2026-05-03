import { createRequire } from 'node:module'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TOKTRACK_PACKAGE_SPEC, TOKTRACK_VERSION } from '../../shared/toktrack-version.js'

const require = createRequire(import.meta.url)
const packageJson = require('../../package.json') as {
  dependencies?: Record<string, string>
}
const packageLockJson = require('../../package-lock.json') as {
  packages?: Record<
    string,
    {
      dependencies?: Record<string, string>
      version?: string
    }
  >
}

type BunLockJson = {
  workspaces?: Record<string, { dependencies?: Record<string, string> }>
  packages?: Record<string, [string, ...unknown[]]>
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const exactSemverPattern =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const hardcodedToktrackVersionPattern =
  /(?:toktrack@\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?|TOKTRACK_(?:VERSION|PACKAGE_SPEC):\s*['"`][^'"`]*\d+\.\d+\.\d+)/
const scannedExtensions = new Set([
  '.bat',
  '.cjs',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.sh',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
])
const excludedDirectories = new Set([
  '.git',
  '.tmp-playwright',
  'coverage',
  'dist',
  'docs/review',
  'node_modules',
  'playwright-report',
  'test-results',
])
const excludedFiles = new Set(['bun.lock', 'CHANGELOG.md', 'package-lock.json'])

function getToktrackDependency() {
  const version = packageJson.dependencies?.toktrack
  if (typeof version !== 'string') {
    throw new Error('package.json dependencies.toktrack must be defined.')
  }

  return version
}

type JsoncOutsideStringTransform = (context: {
  character: string
  index: number
  nextCharacter: string | undefined
  source: string
}) => { nextIndex?: number; text: string } | null

function transformJsoncOutsideStrings(
  source: string,
  transformOutsideString: JsoncOutsideStringTransform,
) {
  let result = ''
  let inString = false
  let isEscaped = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    const nextCharacter = source[index + 1]

    if (inString) {
      result += character
      if (isEscaped) {
        isEscaped = false
      } else if (character === '\\') {
        isEscaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }

    if (character === '"') {
      inString = true
      result += character
      continue
    }

    const transformed = transformOutsideString({
      character,
      index,
      nextCharacter,
      source,
    })
    if (transformed) {
      result += transformed.text
      index = transformed.nextIndex ?? index
      continue
    }

    result += character
  }

  return result
}

// Deliberately dependency-free for a lockfile contract test; the scanner handles escaped
// strings, comments, and trailing commas without mutating comment-like text inside strings.
function stripJsoncComments(source: string) {
  return transformJsoncOutsideStrings(
    source,
    ({ character, index, nextCharacter, source: jsoncSource }) => {
      if (character === '/' && nextCharacter === '/') {
        let nextIndex = index + 2
        while (
          nextIndex < jsoncSource.length &&
          jsoncSource[nextIndex] !== '\n' &&
          jsoncSource[nextIndex] !== '\r'
        ) {
          nextIndex += 1
        }
        return {
          nextIndex,
          text: jsoncSource[nextIndex] ?? '',
        }
      }

      if (character === '/' && nextCharacter === '*') {
        let nextIndex = index + 2
        while (
          nextIndex < jsoncSource.length &&
          !(jsoncSource[nextIndex] === '*' && jsoncSource[nextIndex + 1] === '/')
        ) {
          nextIndex += 1
        }
        return {
          nextIndex: nextIndex < jsoncSource.length ? nextIndex + 1 : nextIndex,
          text: '',
        }
      }

      return null
    },
  )
}

function stripJsoncTrailingCommas(source: string) {
  return transformJsoncOutsideStrings(source, ({ character, index, source: jsoncSource }) => {
    if (character !== ',') {
      return null
    }

    let nextIndex = index + 1
    while (/\s/.test(jsoncSource[nextIndex] ?? '')) {
      nextIndex += 1
    }

    if (jsoncSource[nextIndex] === '}' || jsoncSource[nextIndex] === ']') {
      return { text: '' }
    }

    return null
  })
}

function parseBunLockJsonc(source: string): BunLockJson {
  return JSON.parse(stripJsoncTrailingCommas(stripJsoncComments(source))) as BunLockJson
}

function shouldSkipPath(relativePath: string) {
  return (
    excludedFiles.has(relativePath) ||
    Array.from(excludedDirectories).some(
      (directory) => relativePath === directory || relativePath.startsWith(`${directory}/`),
    )
  )
}

function collectScannedFiles(directory: string, collected: string[] = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name)
    const relativePath = path.relative(repoRoot, absolutePath)

    if (shouldSkipPath(relativePath)) continue

    if (entry.isDirectory()) {
      collectScannedFiles(absolutePath, collected)
      continue
    }

    if (entry.isFile() && scannedExtensions.has(path.extname(entry.name))) {
      collected.push(relativePath)
    }
  }

  return collected
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

  it('keeps npm and bun lockfiles aligned with package.json', () => {
    const toktrackVersion = getToktrackDependency()
    const rootPackage = packageLockJson.packages?.['']
    const installedToktrackPackage = packageLockJson.packages?.['node_modules/toktrack']
    const bunLockJson = parseBunLockJsonc(readFileSync(path.join(repoRoot, 'bun.lock'), 'utf8'))

    expect(rootPackage?.dependencies?.toktrack).toBe(toktrackVersion)
    expect(installedToktrackPackage?.version).toBe(toktrackVersion)
    expect(bunLockJson.workspaces?.['']?.dependencies?.toktrack).toBe(toktrackVersion)
    expect(bunLockJson.packages?.toktrack?.[0]).toBe(`toktrack@${toktrackVersion}`)
  })

  it('keeps toktrack package specs free of hardcoded versions outside managed files', () => {
    const offenders = collectScannedFiles(repoRoot).filter((relativePath) => {
      const content = readFileSync(path.join(repoRoot, relativePath), 'utf8')
      return hardcodedToktrackVersionPattern.test(content)
    })

    expect(offenders).toEqual([])
  })
})
