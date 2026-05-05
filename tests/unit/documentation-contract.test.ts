import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

async function readRepoFile(path: string) {
  return readFile(path, 'utf8')
}

describe('documentation contracts', () => {
  it('keeps remote binding examples aligned with token authentication', async () => {
    const docs = {
      'README.md': await readRepoFile('README.md'),
      'SECURITY.md': await readRepoFile('SECURITY.md'),
    }
    const remoteBindWithoutTokenPattern =
      /^(?![^\n`]*TTDASH_REMOTE_TOKEN)(?=[^\n`]*TTDASH_ALLOW_REMOTE=1)(?=[^\n`]*HOST=0\.0\.0\.0)[^\n`]*/m
    const bindAddressApiUrlPattern = /http:\/\/0\.0\.0\.0(?::\d+)?\/api\/usage/

    for (const [path, content] of Object.entries(docs)) {
      expect(content, path).not.toMatch(remoteBindWithoutTokenPattern)
      expect(content, path).not.toMatch(bindAddressApiUrlPattern)
      expect(content, path).toContain('TTDASH_REMOTE_TOKEN=<long-random-token>')
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
    const firstRunStart = readme.indexOf('## First Run')
    const commonCommandsStart = readme.indexOf('## Common Commands')

    expect(firstRunStart, 'README must have a First Run section').toBeGreaterThanOrEqual(0)
    expect(commonCommandsStart, 'README must have Common Commands after First Run').toBeGreaterThan(
      firstRunStart,
    )

    const firstRunSection = readme.slice(firstRunStart, commonCommandsStart)

    expect(firstRunSection).toContain('exact `toktrack` package spec pinned by this TTDash release')
    expect(firstRunSection).toContain('`bunx`')
    expect(firstRunSection).toContain('`npx --yes`')
    expect(firstRunSection).not.toMatch(/toktrack@\d+\.\d+\.\d+/)
    expect(firstRunSection).not.toContain('toktrack@<pinned version>')
  })

  it('keeps contributor Playwright docs on the stable local command path', async () => {
    const docs = {
      'README.md': await readRepoFile('README.md'),
      'CONTRIBUTING.md': await readRepoFile('CONTRIBUTING.md'),
    }
    const uncappedPortOverridePattern =
      /PLAYWRIGHT_TEST_PORT=3016 npm run test:e2e(?!:(?:ci|parallel|smoke))/

    for (const [path, content] of Object.entries(docs)) {
      expect(content, path).toContain('npm run verify:full')
      expect(content, path).toContain('PLAYWRIGHT_TEST_PORT=3016 npm run test:e2e:ci')
      expect(content, path).not.toMatch(uncappedPortOverridePattern)
    }
  })
})
