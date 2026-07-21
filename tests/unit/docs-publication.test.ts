import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

type VerificationOptions = {
  basePath?: string
  distDir?: string
  maxArtifactBytes?: number
  repoRoot?: string
  requiredSourceDir?: string
  sourceDirs?: string[]
}

type DocsPublicationVerifier = {
  extractRootRelativeUrls: (html: string) => string[]
  findPrivateReferences: (value: string) => string[]
  normalizeBasePath: (value: string) => string
  parseArgs: (args: string[]) => VerificationOptions
  urlUsesBasePath: (url: string, basePath: string) => boolean
  verifyBuiltArtifact: (options: VerificationOptions) => {
    basePath: string
    fileCount: number
    totalBytes: number
  }
  verifyDocsPublication: (options: VerificationOptions) => {
    artifact: { basePath: string; fileCount: number; totalBytes: number }
    sources: { fileCount: number; sourceDirs: string[] }
  }
  verifyPublicSources: (options: VerificationOptions) => {
    fileCount: number
    sourceDirs: string[]
  }
}

const require = createRequire(import.meta.url)
const verifier = require('../../scripts/verify-docs-publication.js') as DocsPublicationVerifier

const temporaryDirectories: string[] = []

async function writeFixtureFile(root: string, relativePath: string, content: string | Buffer) {
  const destination = path.join(root, relativePath)
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, content)
}

function git(root: string, args: string[]) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function createValidFixture() {
  const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'ttdash-docs-publication-'))
  temporaryDirectories.push(repoRoot)

  await writeFixtureFile(
    repoRoot,
    'docs-site/src/content/docs/index.mdx',
    '---\ntitle: TTDash\n---\n\nPublic documentation.\n',
  )
  await writeFixtureFile(
    repoRoot,
    'docs-site/src/styles/custom.css',
    ':root { color-scheme: light dark; }\n',
  )
  await writeFixtureFile(
    repoRoot,
    'docs-site/public/favicon.svg',
    '<svg xmlns="http://www.w3.org/2000/svg"></svg>\n',
  )
  await writeFixtureFile(
    repoRoot,
    'docs-site/dist/index.html',
    '<!doctype html><link rel="stylesheet" href="/ttdash/_astro/site.css"><a href="/ttdash/getting-started/">Start</a>',
  )
  await writeFixtureFile(
    repoRoot,
    'docs-site/dist/404.html',
    '<!doctype html><a href="/ttdash/">Return home</a>',
  )
  await writeFixtureFile(repoRoot, 'docs-site/dist/pagefind/pagefind.js', 'export {}\n')
  await writeFixtureFile(
    repoRoot,
    'docs-site/dist/pagefind/pagefind-entry.json',
    '{"languages":{"en":{}}}\n',
  )

  git(repoRoot, ['init', '--quiet'])
  git(repoRoot, ['add', '--all'])

  return repoRoot
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        force: true,
        recursive: true,
      }),
    ),
  )
})

describe('documentation publication verifier', () => {
  it('accepts a tracked public source allowlist and complete Pages artifact', async () => {
    const repoRoot = await createValidFixture()

    expect(verifier.verifyDocsPublication({ repoRoot })).toMatchObject({
      artifact: {
        basePath: '/ttdash/',
        fileCount: 4,
      },
      sources: {
        fileCount: 3,
        sourceDirs: ['docs-site/src', 'docs-site/public'],
      },
    })
  })

  it('rejects untracked and gitignored files from the public source tree', async () => {
    const repoRoot = await createValidFixture()
    await writeFixtureFile(
      repoRoot,
      'docs-site/src/content/docs/untracked.md',
      'This file was not reviewed.\n',
    )

    expect(() => verifier.verifyPublicSources({ repoRoot })).toThrow(
      /untracked\.md is not tracked by git/,
    )

    await writeFixtureFile(repoRoot, '.gitignore', 'docs-site/src/content/docs/index.mdx\n')
    git(repoRoot, ['add', '.gitignore'])

    expect(() => verifier.verifyPublicSources({ repoRoot })).toThrow(
      /index\.mdx is matched by \.gitignore/,
    )
  })

  it.skipIf(process.platform === 'win32')(
    'rejects symbolic links instead of following content outside the allowlist',
    async () => {
      const repoRoot = await createValidFixture()
      await symlink(
        path.join(repoRoot, 'docs-site/dist/index.html'),
        path.join(repoRoot, 'docs-site/src/content/docs/leak.md'),
      )
      git(repoRoot, ['add', 'docs-site/src/content/docs/leak.md'])

      expect(() => verifier.verifyPublicSources({ repoRoot })).toThrow(
        /leak\.md is a symbolic link/,
      )
    },
  )

  it('blocks known private report paths and references in both source and output', async () => {
    const sourceRepo = await createValidFixture()
    await writeFixtureFile(
      sourceRepo,
      'docs-site/src/content/docs/internal.md',
      'Copied from docs/review/documentation-review.md.\n',
    )
    git(sourceRepo, ['add', 'docs-site/src/content/docs/internal.md'])

    expect(() => verifier.verifyPublicSources({ repoRoot: sourceRepo })).toThrow(
      /contains a reference to blocked private review directory/,
    )

    const artifactRepo = await createValidFixture()
    await writeFixtureFile(
      artifactRepo,
      'docs-site/dist/reference/application-stack-reference/index.html',
      '<!doctype html><a href="/ttdash/">Home</a>',
    )

    expect(() => verifier.verifyBuiltArtifact({ repoRoot: artifactRepo })).toThrow(
      /matches blocked application stack review/,
    )
  })

  it('requires the 404 page, Pagefind index, correct base paths, and a bounded artifact', async () => {
    const repoRoot = await createValidFixture()
    await rm(path.join(repoRoot, 'docs-site/dist/404.html'))
    await rm(path.join(repoRoot, 'docs-site/dist/pagefind/pagefind-entry.json'))
    await writeFixtureFile(
      repoRoot,
      'docs-site/dist/index.html',
      '<!doctype html><script src="/_astro/site.js"></script>',
    )

    expect(() => verifier.verifyBuiltArtifact({ repoRoot, maxArtifactBytes: 10 })).toThrowError(
      expect.objectContaining({
        message: expect.stringMatching(
          /404\.html is missing[\s\S]*does not contain a generated search index[\s\S]*outside \/ttdash\/[\s\S]*exceeding the 10-byte publication limit/,
        ),
      }),
    )
  })

  it('normalizes CLI inputs and only accepts root-relative URLs within the Pages base', () => {
    expect(
      verifier.parseArgs(['--source', 'site/src', '--base', '/ttdash', '--max-bytes', '42']),
    ).toEqual({
      basePath: '/ttdash',
      maxArtifactBytes: 42,
      sourceDirs: ['site/src'],
    })
    expect(verifier.normalizeBasePath('/ttdash')).toBe('/ttdash/')
    expect(verifier.extractRootRelativeUrls('<a href="/ttdash/a"><img src="/bad.png">')).toEqual([
      '/ttdash/a',
      '/bad.png',
    ])
    expect(
      verifier.extractRootRelativeUrls(`
        <img srcset="/ttdash/one.png 1x, /bad/two.png 2x" src="relative.png">
        <video poster="/ttdash/poster.png"></video>
        <style>.hero { background: url('/bad/background.png'); }</style>
        <meta http-equiv="refresh" content="0; url=/ttdash/next/">
      `),
    ).toEqual([
      '/ttdash/one.png',
      '/bad/two.png',
      '/ttdash/poster.png',
      '/bad/background.png',
      '/ttdash/next/',
    ])
    expect(verifier.urlUsesBasePath('/ttdash?q=1', '/ttdash/')).toBe(true)
    expect(verifier.urlUsesBasePath('/ttdashboard/', '/ttdash/')).toBe(false)
    expect(() => verifier.parseArgs(['--unknown'])).toThrow(/Unknown or incomplete argument/)
  })
})
