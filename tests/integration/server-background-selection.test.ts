import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createCliEnv,
  runCli,
  stopAllBackgroundServers,
  waitForBackgroundRegistry,
  waitForServerUnavailable,
  waitForUrlAvailable,
} from './server-test-helpers'

describe('local server background instance selection', () => {
  it('starts background servers and stops the selected instance via the CLI', async () => {
    const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-test-'))
    const backgroundEnv = createCliEnv(backgroundRoot)

    try {
      const firstStart = await runCli(['--background', '--no-open'], {
        env: backgroundEnv,
      })
      expect(firstStart.code).toBe(0)

      const [firstInstance] = await waitForBackgroundRegistry(
        backgroundRoot,
        (entries) => entries.length === 1,
      )
      const firstUrl = firstInstance!.url
      await waitForUrlAvailable(firstUrl)

      const secondStart = await runCli(['--background', '--no-open'], {
        env: backgroundEnv,
      })
      expect(secondStart.code).toBe(0)

      const registry = await waitForBackgroundRegistry(
        backgroundRoot,
        (entries) => entries.length === 2,
        30_000,
      )
      const secondIndex = registry.findIndex((entry) => entry.url !== firstUrl)
      expect(secondIndex).toBeGreaterThanOrEqual(0)
      const secondUrl = registry[secondIndex]!.url
      await waitForUrlAvailable(secondUrl)

      const stopSecond = await runCli(['stop'], {
        env: backgroundEnv,
        input: `${secondIndex + 1}\n`,
      })
      expect(stopSecond.code).toBe(0)
      await waitForServerUnavailable(secondUrl)
      await waitForUrlAvailable(firstUrl)

      const stopFirst = await runCli(['stop'], {
        env: backgroundEnv,
      })
      expect(stopFirst.code).toBe(0)
      await waitForServerUnavailable(firstUrl)
    } finally {
      await stopAllBackgroundServers(backgroundEnv, backgroundRoot)
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  }, 45_000)
})
