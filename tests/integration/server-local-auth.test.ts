import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  fetchLocalBootstrap,
  fetchTrusted,
  getLocalAuthSessionPath,
  isPosix,
  permissionBits,
  startStandaloneServer,
  stopProcess,
} from './server-test-helpers'
import { createBearerAuthHeader } from './server-auth-test-helpers'

describe('local server session authentication', () => {
  it('accepts an explicit local auth token for package smoke harnesses', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-local-auth-token-test-'))
    const localToken = 'ttdash-local-auth-smoke-token-123456'
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: {
          TTDASH_LOCAL_AUTH_TOKEN: localToken,
        },
        readinessHeaders: {
          Authorization: createBearerAuthHeader(localToken),
        },
      })

      const unauthenticatedResponse = await fetch(`${standaloneServer.url}/api/usage`)
      expect(unauthenticatedResponse.status).toBe(401)

      const authenticatedResponse = await fetch(`${standaloneServer.url}/api/usage`, {
        headers: {
          Authorization: createBearerAuthHeader(localToken),
        },
      })
      expect(authenticatedResponse.status).toBe(200)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  }, 20_000)

  it('protects loopback read APIs and accepts bearer or bootstrap cookie credentials', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-local-auth-test-'))
    const localToken = 'ttdash-local-auth-bootstrap-token-123456'
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: {
          TTDASH_LOCAL_AUTH_TOKEN: localToken,
        },
        readinessHeaders: {
          Authorization: createBearerAuthHeader(localToken),
        },
      })

      for (const apiPath of [
        '/api/usage',
        '/api/settings',
        '/api/runtime',
        '/api/toktrack/version-status',
      ]) {
        const unauthenticatedResponse = await fetch(`${standaloneServer.url}${apiPath}`)
        expect(unauthenticatedResponse.status).toBe(401)

        const authenticatedResponse = await fetch(`${standaloneServer.url}${apiPath}`, {
          headers: standaloneServer.authHeaders,
        })
        expect(authenticatedResponse.status).toBe(200)
      }

      const bootstrapResponse = await fetchLocalBootstrap(
        `${standaloneServer.url}/?ttdash_token=${localToken}`,
        {
          redirect: 'manual',
        },
      )
      expect(bootstrapResponse.status).toBe(303)
      expect(bootstrapResponse.headers.get('location')).toBe('/')
      const cookieHeader = bootstrapResponse.headers.get('set-cookie')?.split(';', 1)[0]
      expect(cookieHeader).toContain('ttdash_auth=')

      const cookieResponse = await fetch(`${standaloneServer.url}/api/usage`, {
        headers: { Cookie: cookieHeader || '' },
      })
      expect(cookieResponse.status).toBe(200)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  }, 20_000)

  it('keeps mutation origin guards active after local authentication', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-local-auth-guards-test-'))
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({ root: runtimeRoot })

      const missingOriginResponse = await fetch(`${standaloneServer.url}/api/usage`, {
        method: 'DELETE',
        headers: standaloneServer.authHeaders,
      })
      expect(missingOriginResponse.status).toBe(403)

      const trustedResponse = await fetchTrusted(`${standaloneServer.url}/api/usage`, {
        method: 'DELETE',
      })
      expect(trustedResponse.status).toBe(200)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  }, 20_000)

  it.skipIf(!isPosix)(
    'writes the local auth session file with restrictive permissions',
    async () => {
      const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-local-auth-permissions-test-'))
      let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

      try {
        standaloneServer = await startStandaloneServer({ root: runtimeRoot })

        expect(permissionBits(getLocalAuthSessionPath(runtimeRoot))).toBe(0o600)
      } finally {
        if (standaloneServer) await stopProcess(standaloneServer.child)
        rmSync(runtimeRoot, { recursive: true, force: true })
      }
    },
    20_000,
  )
})
