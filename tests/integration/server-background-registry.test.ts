import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createCliEnv,
  createSharedServerContext,
  readBackgroundRegistry,
  registerSharedServerLifecycle,
  runCli,
  writeBackgroundRegistry,
} from './server-test-helpers'

const sharedServer = createSharedServerContext()
registerSharedServerLifecycle(sharedServer)

describe('local server background registry pruning', () => {
  it('prunes stale background entries that point to a live non-matching process', async () => {
    const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-stale-test-'))
    const backgroundEnv = createCliEnv(backgroundRoot)

    try {
      const sharedServerPid = sharedServer.child?.pid
      if (!sharedServerPid) {
        throw new Error('Shared server child process was not started.')
      }
      const sharedServerOrigin = new URL(sharedServer.baseUrl).origin
      const sharedServerPort = Number.parseInt(new URL(sharedServer.baseUrl).port, 10)

      writeBackgroundRegistry(backgroundRoot, [
        {
          id: 'stale-entry',
          pid: sharedServerPid,
          port: sharedServerPort,
          url: sharedServerOrigin,
          host: '127.0.0.1',
          startedAt: new Date().toISOString(),
          logFile: null,
          ...(sharedServer.authHeader ? { authHeader: sharedServer.authHeader } : {}),
        },
      ])

      const stopResult = await runCli(['stop'], { env: backgroundEnv })
      expect(stopResult.code).toBe(0)
      expect(readBackgroundRegistry(backgroundRoot)).toEqual([])
    } finally {
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  }, 15_000)

  it('rejects registry fixtures that would be rewritten by normalization', () => {
    const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-invalid-test-'))

    try {
      expect(() =>
        writeBackgroundRegistry(backgroundRoot, [
          {
            id: 'rewritten-entry',
            pid: process.pid,
            port: 3011,
            url: 'http://127.0.0.1:3011/dashboard',
            host: '127.0.0.1',
            startedAt: new Date().toISOString(),
            logFile: null,
          },
        ]),
      ).toThrow('Invalid test background registry entry at index 0.')
    } finally {
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  })
})
