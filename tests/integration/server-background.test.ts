import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createCliEnv,
  isPosix,
  permissionBits,
  runCli,
  stopAllBackgroundServers,
  waitForBackgroundRegistry,
  waitForHttpOk,
  waitForServerUnavailable,
} from './server-test-helpers'

const itIfPosix = isPosix ? it : it.skip

describe('local server background custom prefix integration', () => {
  itIfPosix(
    'hardens background log files and stops background instances with a custom API prefix',
    async () => {
      const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-prefix-test-'))
      const backgroundEnv = {
        ...createCliEnv(backgroundRoot),
        API_PREFIX: '/custom-api',
      }

      try {
        const startResult = await runCli(['--background', '--no-open'], {
          env: backgroundEnv,
        })
        expect(startResult.code).toBe(0)

        const [instance] = await waitForBackgroundRegistry(
          backgroundRoot,
          (entries) => entries.length === 1,
        )
        const backgroundUrl = instance!.url
        await waitForHttpOk(`${backgroundUrl}/custom-api/usage`)
        expect(instance?.apiPrefix).toBe('/custom-api')
        expect(instance?.bootstrapUrl).toContain('ttdash_token=')
        expect(startResult.output).toContain('Local Auth URL:')
        expect(instance?.logFile).toBeTruthy()
        expect(permissionBits(instance!.logFile!)).toBe(0o600)

        const stopResult = await runCli(['stop'], { env: backgroundEnv })
        expect(stopResult.code).toBe(0)
        await waitForServerUnavailable(backgroundUrl)
      } finally {
        await stopAllBackgroundServers(backgroundEnv, backgroundRoot)
        rmSync(backgroundRoot, { recursive: true, force: true })
      }
    },
    45_000,
  )
})
