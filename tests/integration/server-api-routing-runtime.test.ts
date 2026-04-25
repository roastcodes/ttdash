import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { fetchWithAuth, startStandaloneServer, stopProcess } from './server-test-helpers'
import { createApiSharedServer } from './server-api-test-helpers'

const sharedServer = createApiSharedServer()

describe('local server API routing and runtime metadata', () => {
  it('serves the API only from the configured API prefix', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-api-prefix-test-'))
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: { API_PREFIX: '/custom-api' },
        readinessPath: '/custom-api/usage',
      })

      expect(
        (
          await fetch(`${standaloneServer.url}/custom-api/usage`, {
            headers: standaloneServer.authHeaders,
          })
        ).status,
      ).toBe(200)
      expect((await fetch(`${standaloneServer.url}/api/usage`)).status).toBe(404)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('returns only the runtime metadata that the app still needs', async () => {
    const runtimeResponse = await fetchWithAuth(`${sharedServer.baseUrl}/api/runtime`)
    expect(runtimeResponse.status).toBe(200)
    expect(await runtimeResponse.json()).toEqual({
      id: expect.any(String),
      mode: 'foreground',
      port: Number(new URL(sharedServer.baseUrl).port),
      url: sharedServer.baseUrl,
    })
  })
})
