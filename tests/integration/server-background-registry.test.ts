import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createCliEnv,
  createSharedServerContext,
  fetchWithAuth,
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
      const runtimeResponse = await fetchWithAuth(`${sharedServer.baseUrl}/api/runtime`)
      const runtime = await runtimeResponse.json()
      const sharedServerPid = sharedServer.child?.pid
      if (!sharedServerPid) {
        throw new Error('Shared server child process was not started.')
      }

      writeBackgroundRegistry(backgroundRoot, [
        {
          id: 'stale-entry',
          pid: sharedServerPid,
          port: runtime.port,
          url: sharedServer.baseUrl,
          host: '127.0.0.1',
          authHeader: sharedServer.authHeader,
          startedAt: new Date().toISOString(),
          logFile: null,
        },
      ])

      const stopResult = await runCli(['stop'], { env: backgroundEnv })
      expect(stopResult.code).toBe(0)
      expect(readBackgroundRegistry(backgroundRoot)).toEqual([])
    } finally {
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  }, 15_000)
})
