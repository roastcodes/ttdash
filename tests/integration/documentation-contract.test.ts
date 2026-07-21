import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const publicDocsRoot = 'docs-site/src/content/docs'
const rootDocumentationFiles = ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'RELEASING.md']
const canonicalDocs = {
  architecture: `${publicDocsRoot}/contributing/architecture.md`,
  api: `${publicDocsRoot}/reference/http-api.md`,
  configuration: `${publicDocsRoot}/deploying/configuration.md`,
  dataFormats: `${publicDocsRoot}/reference/data-formats.md`,
  importingData: `${publicDocsRoot}/getting-started/importing-data.md`,
  remoteAccess: `${publicDocsRoot}/deploying/remote-access.md`,
  testing: `${publicDocsRoot}/contributing/testing.md`,
} as const

const publicRuntimeVariables = [
  'PORT',
  'HOST',
  'NO_OPEN_BROWSER',
  'TTDASH_ALLOW_REMOTE',
  'TTDASH_REMOTE_TOKEN',
  'TTDASH_DOCKER',
  'TTDASH_TRUSTED_HOSTS',
  'TTDASH_SECURE_COOKIE',
  'TTDASH_TRUST_PROXY',
  'TTDASH_DATA_DIR',
  'TTDASH_CONFIG_DIR',
  'TTDASH_CACHE_DIR',
  'TTDASH_TOKTRACK_LOCAL_BIN',
]

const internalRuntimeVariables = [
  'API_PREFIX',
  'TTDASH_AUTH_STATUS_FILE',
  'TTDASH_BACKGROUND_CHILD',
  'TTDASH_BACKGROUND_LOG_FILE',
  'TTDASH_FORCE_OPEN_BROWSER',
  'TTDASH_INSTANCE_ID',
  'TTDASH_LOCAL_AUTH_TOKEN',
]

async function readRepoFile(filePath: string) {
  return readFile(filePath, 'utf8')
}

async function listMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return listMarkdownFiles(entryPath)
      return /\.mdx?$/i.test(entry.name) ? [entryPath] : []
    }),
  )

  return files.flat().sort()
}

async function readPublicDocsCorpus() {
  const files = await listMarkdownFiles(publicDocsRoot)
  const contents = await Promise.all(files.map((filePath) => readRepoFile(filePath)))
  return contents.join('\n')
}

function markdownTargetCandidates(markdownPath: string, rawTarget: string) {
  const withoutFragment = rawTarget.replace(/^<|>$/g, '').split(/[?#]/, 1)[0]
  if (!withoutFragment) return []

  let resolved: string
  if (withoutFragment.startsWith('/ttdash/')) {
    const routePath = withoutFragment.slice('/ttdash/'.length)
    resolved = path.resolve(publicDocsRoot, routePath)
  } else {
    resolved = path.resolve(path.dirname(markdownPath), withoutFragment)
  }

  return [
    resolved,
    `${resolved}.md`,
    `${resolved}.mdx`,
    path.join(resolved, 'index.md'),
    path.join(resolved, 'index.mdx'),
  ]
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function gitOutput(args: string[]) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

describe('documentation contracts', () => {
  it('keeps remote binding guidance aligned with token authentication', async () => {
    const docs = {
      'SECURITY.md': await readRepoFile('SECURITY.md'),
      [canonicalDocs.remoteAccess]: await readRepoFile(canonicalDocs.remoteAccess),
    }
    const bindAddressApiUrlPattern = /http:\/\/0\.0\.0\.0(?::\d+)?\/api\/usage/

    for (const [filePath, content] of Object.entries(docs)) {
      expect(content, filePath).not.toMatch(bindAddressApiUrlPattern)
      expect(content, filePath).toContain('TTDASH_REMOTE_TOKEN')
      expect(content, filePath).toContain('TTDASH_ALLOW_REMOTE=1')
      expect(content, filePath).toContain('HOST=0.0.0.0')
      expect(content, filePath).toMatch(/trusted LAN, VPN,(?: or)? SSH tunnel/i)
      expect(content, filePath).toMatch(/HTTPS reverse proxy/i)
      expect(content, filePath).toContain('Authorization: Bearer $TTDASH_REMOTE_TOKEN')
      expect(content, filePath).toContain('X-TTDash-Remote-Token')
    }

    const readme = await readRepoFile('README.md')
    expect(readme).toContain('https://roastcodes.github.io/ttdash/deploying/remote-access/')
    expect(readme).toMatch(/do not send the token or session over public HTTP/i)
  })

  it('keeps toktrack fallback documentation version-agnostic', async () => {
    const readme = await readRepoFile('README.md')
    const importingData = await readRepoFile(canonicalDocs.importingData)

    expect(importingData).toMatch(/exact (?:`?toktrack`? )?package version pinned by/i)
    expect(importingData).toContain('`bunx`')
    expect(importingData).toContain('`npx --yes`')
    expect(`${readme}\n${importingData}`).not.toMatch(/\btoktrack@[^\s`'\")]+/)
  })

  it('does not hardcode release or toktrack versions in public Markdown', async () => {
    const packageJson = JSON.parse(await readRepoFile('package.json')) as {
      dependencies: { toktrack: string }
      version: string
    }
    const publicMarkdownFiles = await listMarkdownFiles(publicDocsRoot)

    for (const markdownPath of publicMarkdownFiles) {
      const content = await readRepoFile(markdownPath)
      expect(content, `${markdownPath}: current TTDash version`).not.toContain(packageJson.version)
      expect(content, `${markdownPath}: current toktrack version`).not.toContain(
        packageJson.dependencies.toktrack,
      )
    }
  })

  it('keeps contributor guidance on the complete application and docs gates', async () => {
    const docs = {
      'CONTRIBUTING.md': await readRepoFile('CONTRIBUTING.md'),
      [canonicalDocs.testing]: await readRepoFile(canonicalDocs.testing),
    }

    for (const [filePath, content] of Object.entries(docs)) {
      expect(content, filePath).toContain('npm run verify:full')
      expect(content, filePath).toContain('npm run docs:verify')
      expect(content, filePath).toContain('npm run test:docs:e2e')
    }
  })

  it('documents every public CLI option and alias in the canonical configuration guide', async () => {
    const configuration = await readRepoFile(canonicalDocs.configuration)

    for (const option of [
      '--port',
      '-p',
      '--help',
      '-h',
      '--no-open',
      '-no',
      '--auto-load',
      '-al',
      '--background',
      '-b',
      '-bg',
      '--docker',
      'ttdash stop',
    ]) {
      expect(configuration, option).toContain(`\`${option}\``)
    }
  })

  it('keeps the canonical environment reference complete and excludes internal variables', async () => {
    const configuration = await readRepoFile(canonicalDocs.configuration)
    const tableStart = configuration.indexOf('## Runtime environment variables')
    const tableEnd = configuration.indexOf('## Precedence and modes')
    const environmentReference = configuration.slice(tableStart, tableEnd)

    expect(tableStart).toBeGreaterThanOrEqual(0)
    expect(tableEnd).toBeGreaterThan(tableStart)

    for (const variable of publicRuntimeVariables) {
      expect(environmentReference, variable).toContain(`\`${variable}`)
    }

    for (const variable of internalRuntimeVariables) {
      expect(configuration, variable).not.toContain(`\`${variable}\``)
    }
  })

  it('only documents npm run commands that exist in the root package', async () => {
    const packageJson = JSON.parse(await readRepoFile('package.json')) as {
      scripts: Record<string, string>
    }
    const activeMarkdownFiles = [
      ...rootDocumentationFiles,
      ...(await listMarkdownFiles(publicDocsRoot)),
    ]

    for (const markdownPath of activeMarkdownFiles) {
      const content = await readRepoFile(markdownPath)
      const referencedScripts = [...content.matchAll(/npm run ([a-z0-9:_-]+)/gi)].map(
        (match) => match[1],
      )

      for (const script of referencedScripts) {
        expect(packageJson.scripts, `${markdownPath}: npm run ${script}`).toHaveProperty(script)
      }
    }
  })

  it('keeps local links and images in public documentation resolvable', async () => {
    const activeMarkdownFiles = [
      ...rootDocumentationFiles,
      ...(await listMarkdownFiles(publicDocsRoot)),
    ]

    for (const markdownPath of activeMarkdownFiles) {
      const content = await readRepoFile(markdownPath)
      const targets = [...content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1])

      for (const rawTarget of targets) {
        if (/^(?:https?:|mailto:)/i.test(rawTarget) || rawTarget.startsWith('#')) continue

        expect(
          rawTarget.startsWith('/') ? rawTarget.startsWith('/ttdash/') : true,
          `${markdownPath}: ${rawTarget}`,
        ).toBe(true)
        const candidates = markdownTargetCandidates(markdownPath, rawTarget)
        expect(
          candidates.some((candidate) => existsSync(candidate)),
          `${markdownPath}: ${rawTarget}`,
        ).toBe(true)
      }
    }
  })

  it('keeps the HTTP API reference aligned with every supported method and route', async () => {
    const api = await readRepoFile(canonicalDocs.api)
    const routes = [
      ['POST', '/api/auth/session'],
      ['GET', '/api/usage'],
      ['DELETE', '/api/usage'],
      ['POST', '/api/upload'],
      ['POST', '/api/usage/import'],
      ['GET', '/api/settings'],
      ['PATCH', '/api/settings'],
      ['DELETE', '/api/settings'],
      ['POST', '/api/settings/import'],
      ['POST', '/api/auto-import/stream'],
      ['GET', '/api/runtime'],
      ['GET', '/api/toktrack/version-status'],
      ['POST', '/api/report/pdf'],
    ]

    for (const [method, route] of routes) {
      const methodAndRoute = new RegExp(
        `${escapeRegExp(method)}[^\\n]{0,80}${escapeRegExp(route)}|${escapeRegExp(route)}[^\\n]{0,80}${escapeRegExp(method)}`,
      )
      expect(api, `${method} ${route}`).toMatch(methodAndRoute)
    }

    expect(api).toContain('text/event-stream')
    expect(api).toMatch(/10 MiB/i)
  })

  it('documents every normalized daily and model-breakdown data field', async () => {
    const dataFormats = await readRepoFile(canonicalDocs.dataFormats)

    for (const field of [
      'date',
      'inputTokens',
      'outputTokens',
      'cacheCreationTokens',
      'cacheReadTokens',
      'thinkingTokens',
      'totalTokens',
      'totalCost',
      'requestCount',
      'modelsUsed',
      'modelBreakdowns',
      'modelName',
      'cost',
    ]) {
      expect(dataFormats, field).toContain(`\`${field}\``)
    }
  })

  it('keeps private review material ignored, untracked, and outside the public collection', async () => {
    for (const privatePath of [
      'docs/security/pentest-publication-probe.md',
      'docs/review/publication-probe.md',
      'docs/application-stack-reference.md',
    ]) {
      expect(() =>
        gitOutput(['check-ignore', '--no-index', '--quiet', '--', privatePath]),
      ).not.toThrow()
    }

    const trackedPrivateFiles = gitOutput([
      'ls-files',
      '--',
      'docs/security',
      'docs/review',
      'docs/application-stack-reference.md',
    ])
    expect(trackedPrivateFiles).toBe('')

    const publicDocs = await readPublicDocsCorpus()
    expect(publicDocs).not.toMatch(/docs\/(?:security|review)\//i)
    expect(publicDocs).not.toContain('application-stack-reference')
    expect(publicDocs).not.toMatch(/\bpentest(?:[._/-]|\b)/i)
  })

  it('derives the visible documentation version from the root package', async () => {
    const component = await readRepoFile('docs-site/src/components/VersionBadge.astro')
    const config = await readRepoFile('docs-site/astro.config.mjs')

    expect(component).toContain("import rootPackage from '../../../package.json'")
    expect(component).toContain('data-ttdash-version={rootPackage.version}')
    expect(config).toContain("new URL('../package.json', import.meta.url)")
    expect(config).toContain("base: '/ttdash'")
    expect(config).toContain("site: 'https://roastcodes.github.io'")
  })
})
