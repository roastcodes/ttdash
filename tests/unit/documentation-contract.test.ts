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
      /TTDASH_ALLOW_REMOTE=1(?![^\n`]*TTDASH_REMOTE_TOKEN)[^\n`]*HOST=0\.0\.0\.0/

    for (const [path, content] of Object.entries(docs)) {
      expect(content, path).not.toMatch(remoteBindWithoutTokenPattern)
      expect(content, path).toContain('TTDASH_REMOTE_TOKEN=<long-random-token>')
    }

    expect(docs['README.md']).toContain('Authorization: Bearer $TTDASH_REMOTE_TOKEN')
    expect(docs['README.md']).toContain('X-TTDash-Remote-Token')
    expect(docs['SECURITY.md']).toContain('Authorization: Bearer $TTDASH_REMOTE_TOKEN')
  })
})
