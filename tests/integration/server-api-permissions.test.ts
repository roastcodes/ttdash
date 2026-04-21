import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  fetchTrusted,
  getCliConfigDir,
  getCliDataDir,
  permissionBits,
  startStandaloneServer,
  stopProcess,
} from './server-test-helpers'
import { sampleUsage } from './server-api-test-helpers'

describe('local server API permissions', () => {
  it('writes persisted data and settings with restrictive local permissions', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-permissions-test-'))
    const dataFile = path.join(getCliDataDir(runtimeRoot), 'data.json')
    const settingsFile = path.join(getCliConfigDir(runtimeRoot), 'settings.json')
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({ root: runtimeRoot })
      expect(
        (
          await fetchTrusted(`${standaloneServer.url}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sampleUsage),
          })
        ).status,
      ).toBe(200)

      expect(
        (
          await fetchTrusted(`${standaloneServer.url}/api/settings`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: 'en' }),
          })
        ).status,
      ).toBe(200)

      expect(permissionBits(path.dirname(dataFile))).toBe(0o700)
      expect(permissionBits(path.dirname(settingsFile))).toBe(0o700)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })
})
