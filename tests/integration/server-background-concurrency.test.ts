import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createCliEnv,
  runCli,
  stopAllBackgroundServers,
  waitForBackgroundRegistry,
  waitForUrlAvailable,
} from './server-test-helpers'

describe('local server background concurrent startup', () => {
  it('keeps both instances in the registry when background starts happen concurrently', async () => {
    const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-parallel-test-'))
    const backgroundEnv = createCliEnv(backgroundRoot)

    try {
      const [firstStart, secondStart] = await Promise.all([
        runCli(['--background', '--no-open'], { env: backgroundEnv }),
        runCli(['--background', '--no-open'], { env: backgroundEnv }),
      ])

      expect(firstStart.code).toBe(0)
      expect(secondStart.code).toBe(0)

      const registry = await waitForBackgroundRegistry(
        backgroundRoot,
        (entries) => entries.length === 2,
        30_000,
      )
      const [firstInstance, secondInstance] = registry
      await waitForUrlAvailable(firstInstance!.url)
      await waitForUrlAvailable(secondInstance!.url)
      expect(registry).toHaveLength(2)
      expect(new Set(registry.map((entry) => entry.url)).size).toBe(2)
    } finally {
      await stopAllBackgroundServers(backgroundEnv, backgroundRoot)
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  }, 60_000)
})
