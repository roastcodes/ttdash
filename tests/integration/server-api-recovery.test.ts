import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  fetchTrusted,
  getCliConfigDir,
  getCliDataDir,
  startStandaloneServer,
  stopProcess,
} from './server-test-helpers'

describe('local server API recovery', () => {
  it('returns 500 for corrupt persisted usage data and recovers after deletion', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-corrupt-usage-test-'))
    const dataFile = path.join(getCliDataDir(runtimeRoot), 'data.json')
    mkdirSync(path.dirname(dataFile), { recursive: true })
    writeFileSync(dataFile, '{not-json')
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        readinessPath: '/api/runtime',
      })

      const corruptResponse = await fetch(`${standaloneServer.url}/api/usage`)
      expect(corruptResponse.status).toBe(500)

      const deleteResponse = await fetchTrusted(`${standaloneServer.url}/api/usage`, {
        method: 'DELETE',
      })
      expect(deleteResponse.status).toBe(200)

      const recoveredResponse = await fetch(`${standaloneServer.url}/api/usage`)
      expect(recoveredResponse.status).toBe(200)
      expect(await recoveredResponse.json()).toEqual({
        daily: [],
        totals: {
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          thinkingTokens: 0,
          totalCost: 0,
          totalTokens: 0,
          requestCount: 0,
        },
      })
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('returns 500 for corrupt persisted settings and recovers after deletion', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-corrupt-settings-test-'))
    const settingsFile = path.join(getCliConfigDir(runtimeRoot), 'settings.json')
    mkdirSync(path.dirname(settingsFile), { recursive: true })
    writeFileSync(settingsFile, '{not-json')
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({ root: runtimeRoot })
      const corruptResponse = await fetch(`${standaloneServer.url}/api/settings`)
      expect(corruptResponse.status).toBe(500)

      const deleteResponse = await fetchTrusted(`${standaloneServer.url}/api/settings`, {
        method: 'DELETE',
      })
      expect(deleteResponse.status).toBe(200)

      const recoveredResponse = await fetch(`${standaloneServer.url}/api/settings`)
      expect(recoveredResponse.status).toBe(200)
      expect(await recoveredResponse.json()).toMatchObject({
        language: 'de',
        theme: 'dark',
        reducedMotionPreference: 'system',
      })
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })
})
