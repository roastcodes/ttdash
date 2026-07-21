import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

async function readRepoFile(path: string) {
  return readFile(path, 'utf8')
}

const activeMarkdownFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'RELEASING.md',
  'docs/api.md',
  'docs/architecture.md',
  'docs/configuration.md',
  'docs/docker.md',
  'docs/testing.md',
  'docs/usage.md',
]

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

describe('documentation contracts', () => {
  it('keeps remote binding examples aligned with token authentication', async () => {
    const docs = {
      'README.md': await readRepoFile('README.md'),
      'SECURITY.md': await readRepoFile('SECURITY.md'),
    }
    const bindAddressApiUrlPattern = /http:\/\/0\.0\.0\.0(?::\d+)?\/api\/usage/

    for (const [path, content] of Object.entries(docs)) {
      expect(content, path).not.toMatch(bindAddressApiUrlPattern)
      expect(content, path).toMatch(/TTDASH_REMOTE_TOKEN=(?:<long-random-token>|"\$\(openssl rand)/)
      expect(content, path).toContain('TTDASH_ALLOW_REMOTE=1')
      expect(content, path).toContain('HOST=0.0.0.0')
      expect(content, path).toContain('trusted LAN, VPN, or SSH tunnel')
      expect(content, path).toContain('HTTPS reverse proxy')
      expect(content, path).toContain('do not send the')
    }

    expect(docs['README.md']).toContain('Authorization: Bearer $TTDASH_REMOTE_TOKEN')
    expect(docs['README.md']).toContain('X-TTDash-Remote-Token')
    expect(docs['SECURITY.md']).toContain('Authorization: Bearer $TTDASH_REMOTE_TOKEN')
    expect(docs['SECURITY.md']).toContain('X-TTDash-Remote-Token')
  })

  it('keeps README toktrack fallback docs version-agnostic', async () => {
    const readme = await readRepoFile('README.md')
    const usageGuide = await readRepoFile('docs/usage.md')

    expect(usageGuide).toContain(
      'exact `toktrack` package spec pinned by the current TTDash release',
    )
    expect(usageGuide).toContain('`bunx`')
    expect(usageGuide).toContain('`npx --yes`')
    expect(`${readme}\n${usageGuide}`).not.toMatch(/\btoktrack@[^\s`'\")]+/)
  })

  it('keeps contributor Playwright docs on the stable local command path', async () => {
    const docs = {
      'CONTRIBUTING.md': await readRepoFile('CONTRIBUTING.md'),
      'docs/testing.md': await readRepoFile('docs/testing.md'),
    }
    const uncappedPortOverridePattern =
      /PLAYWRIGHT_TEST_PORT=3016 npm run test:e2e(?!:(?:ci|parallel|smoke))/

    for (const [path, content] of Object.entries(docs)) {
      expect(content, path).toContain('npm run verify:full')
      expect(content, path).toContain('PLAYWRIGHT_TEST_PORT=3016 npm run test:e2e:ci')
      expect(content, path).not.toMatch(uncappedPortOverridePattern)
    }
  })

  it('documents every public CLI option and alias in the canonical configuration guide', async () => {
    const configuration = await readRepoFile('docs/configuration.md')

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
    const configuration = await readRepoFile('docs/configuration.md')
    const tableStart = configuration.indexOf('## Runtime Environment Variables')
    const tableEnd = configuration.indexOf('## Precedence and Modes')
    const environmentReference = configuration.slice(tableStart, tableEnd)

    expect(tableStart).toBeGreaterThanOrEqual(0)
    expect(tableEnd).toBeGreaterThan(tableStart)

    for (const variable of publicRuntimeVariables) {
      expect(environmentReference, variable).toContain(`\`${variable}`)
    }

    for (const variable of internalRuntimeVariables) {
      expect(configuration, variable).not.toContain(`\`${variable}`)
    }
  })

  it('only documents npm run commands that exist in package.json', async () => {
    const packageJson = JSON.parse(await readRepoFile('package.json')) as {
      scripts: Record<string, string>
    }

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

  it('keeps local links and images in active documentation resolvable', async () => {
    for (const markdownPath of activeMarkdownFiles) {
      const content = await readRepoFile(markdownPath)
      const targets = [...content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1])

      for (const rawTarget of targets) {
        const target = rawTarget.replace(/^<|>$/g, '').split('#')[0]
        if (!target || /^(?:https?:|mailto:)/i.test(target)) continue

        expect(path.isAbsolute(target), `${markdownPath}: ${rawTarget}`).toBe(false)
        const resolved = path.resolve(path.dirname(markdownPath), target)
        expect(existsSync(resolved), `${markdownPath}: ${rawTarget}`).toBe(true)
      }
    }
  })

  it('keeps the compact API reference aligned with the supported route surface', async () => {
    const api = await readRepoFile('docs/api.md')
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
      expect(api, `${method} ${route}`).toMatch(
        new RegExp(`\\|\\s*\\\`${method}\\\`\\s*\\|\\s*\\\`${route}\\\``),
      )
    }
  })
})
