import { describe, expect, it } from 'vitest'
import sampleUsage from '../../examples/sample-usage.json'
import { TOKTRACK_VERSION } from '../../shared/toktrack-version.js'
import {
  chmodSync,
  fetchTrusted,
  isPosix,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  startStandaloneServer,
  stopProcess,
  tmpdir,
  writeFileSync,
} from './server-test-helpers'

const itIfPosix = isPosix ? it : it.skip

describe('local server auto-import integration', () => {
  it('streams auto-import events over POST instead of mutating via GET', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-auto-import-post-test-'))
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: { PATH: '' },
      })

      const streamResponse = await fetchTrusted(`${standaloneServer.url}/api/auto-import/stream`, {
        method: 'POST',
      })

      expect(streamResponse.status).toBe(200)
      expect(streamResponse.headers.get('content-type')).toContain('text/event-stream')
      const streamBody = await streamResponse.text()
      expect(streamBody).toContain('event: check')
      expect(streamBody).toContain('event: error')
      expect(streamBody).toContain('event: done')
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  itIfPosix(
    'streams a structured invalid-JSON auto-import error when toktrack output is malformed',
    async () => {
      const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-auto-import-invalid-json-'))
      const fakeToktrackPath = path.join(runtimeRoot, 'fake-toktrack')
      let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

      writeFileSync(
        fakeToktrackPath,
        [
          '#!/bin/sh',
          'if [ "$1" = "--version" ]; then',
          `  echo "toktrack ${TOKTRACK_VERSION}"`,
          '  exit 0',
          'fi',
          'echo "{invalid json"',
          'exit 0',
        ].join('\n'),
      )
      chmodSync(fakeToktrackPath, 0o755)

      try {
        standaloneServer = await startStandaloneServer({
          root: runtimeRoot,
          envOverrides: {
            PATH: '',
            TTDASH_TOKTRACK_LOCAL_BIN: fakeToktrackPath,
          },
        })

        const streamResponse = await fetchTrusted(
          `${standaloneServer.url}/api/auto-import/stream`,
          {
            method: 'POST',
          },
        )

        expect(streamResponse.status).toBe(200)
        const streamBody = await streamResponse.text()
        expect(streamBody).toContain('event: error')
        expect(streamBody).toContain('"key":"toktrackInvalidJson"')
        expect(streamBody).toContain('event: done')
      } finally {
        if (standaloneServer) await stopProcess(standaloneServer.child)
        rmSync(runtimeRoot, { recursive: true, force: true })
      }
    },
    15_000,
  )

  itIfPosix(
    'rejects parallel auto-import starts before launching a second toktrack runner',
    async () => {
      const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-auto-import-singleton-'))
      const fakeToktrackPath = path.join(runtimeRoot, 'fake-toktrack')
      const invocationCountPath = path.join(runtimeRoot, 'toktrack-daily-count.txt')
      let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

      writeFileSync(
        fakeToktrackPath,
        [
          `#!${process.execPath}`,
          "const fs = require('node:fs')",
          `const countFile = ${JSON.stringify(invocationCountPath)}`,
          `const payload = ${JSON.stringify(sampleUsage)}`,
          'if (process.argv[2] === "--version") {',
          `  console.log("toktrack ${TOKTRACK_VERSION}")`,
          '  process.exit(0)',
          '}',
          'let count = 0',
          'try {',
          '  count = Number.parseInt(fs.readFileSync(countFile, "utf-8"), 10) || 0',
          '} catch {}',
          'fs.writeFileSync(countFile, String(count + 1))',
          'setTimeout(() => {',
          '  process.stdout.write(JSON.stringify(payload))',
          '}, 2000)',
        ].join('\n'),
      )
      chmodSync(fakeToktrackPath, 0o755)

      try {
        standaloneServer = await startStandaloneServer({
          root: runtimeRoot,
          envOverrides: {
            PATH: '',
            TTDASH_TOKTRACK_LOCAL_BIN: fakeToktrackPath,
          },
        })

        const firstResponse = await fetchTrusted(`${standaloneServer.url}/api/auto-import/stream`, {
          method: 'POST',
        })
        expect(firstResponse.status).toBe(200)

        const secondResponse = await fetchTrusted(
          `${standaloneServer.url}/api/auto-import/stream`,
          {
            method: 'POST',
          },
        )
        expect(secondResponse.status).toBe(409)
        expect(await secondResponse.json()).toEqual({
          message: 'An auto-import is already running. Please wait.',
        })

        const firstStreamBody = await firstResponse.text()
        expect(firstStreamBody).toContain('event: success')
        expect(firstStreamBody).toContain('event: done')
        expect(readFileSync(invocationCountPath, 'utf-8')).toBe('1')
      } finally {
        if (standaloneServer) await stopProcess(standaloneServer.child)
        rmSync(runtimeRoot, { recursive: true, force: true })
      }
    },
    15_000,
  )
})
