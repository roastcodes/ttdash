import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createBearerAuthHeader, createRemoteAuthTestToken } from '../auth-test-helpers'
import {
  createCliEnv,
  fetchTrusted,
  runCli,
  startStandaloneServer,
  stopProcess,
} from './server-test-helpers'

const remoteToken = createRemoteAuthTestToken()
const remoteAuthHeader = createBearerAuthHeader(remoteToken)

describe('remote server authentication', () => {
  let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null
  let runtimeRoot: string | null = null

  afterEach(async () => {
    if (standaloneServer) {
      await stopProcess(standaloneServer.child)
      standaloneServer = null
    }

    if (runtimeRoot) {
      rmSync(runtimeRoot, { recursive: true, force: true })
      runtimeRoot = null
    }
  })

  it('requires TTDASH_REMOTE_TOKEN when remote binding is explicitly enabled', async () => {
    runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-remote-auth-required-test-'))

    const result = await runCli([], {
      env: {
        ...createCliEnv(runtimeRoot),
        HOST: '0.0.0.0',
        NO_OPEN_BROWSER: '1',
        TTDASH_ALLOW_REMOTE: '1',
      },
    })

    expect(result.code).toBe(1)
    expect(result.output).toContain('TTDASH_REMOTE_TOKEN')
  })

  it('protects remote API routes with bearer, explicit header, and cookie credentials', async () => {
    runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-remote-auth-api-test-'))
    standaloneServer = await startRemoteServer(runtimeRoot)

    const unauthenticatedResponse = await fetch(`${standaloneServer.url}/api/usage`)
    expect(unauthenticatedResponse.status).toBe(401)
    expect(await unauthenticatedResponse.json()).toEqual({ message: 'Authentication required' })

    const bearerResponse = await fetch(`${standaloneServer.url}/api/usage`, {
      headers: { Authorization: remoteAuthHeader },
    })
    expect(bearerResponse.status).toBe(200)

    const headerResponse = await fetch(`${standaloneServer.url}/api/usage`, {
      headers: { 'X-TTDash-Remote-Token': remoteToken },
    })
    expect(headerResponse.status).toBe(200)

    const bootstrapResponse = await fetch(
      `${standaloneServer.url}/?ttdash_token=${encodeURIComponent(remoteToken)}`,
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
  }, 20_000)

  it('keeps host and origin mutation guards active after remote authentication', async () => {
    runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-remote-auth-guards-test-'))
    standaloneServer = await startRemoteServer(runtimeRoot)

    const missingOriginResponse = await fetch(`${standaloneServer.url}/api/usage`, {
      method: 'DELETE',
      headers: { Authorization: remoteAuthHeader },
    })
    expect(missingOriginResponse.status).toBe(403)

    const trustedResponse = await fetchTrusted(`${standaloneServer.url}/api/usage`, {
      method: 'DELETE',
      headers: { Authorization: remoteAuthHeader },
    })
    expect(trustedResponse.status).toBe(200)
  }, 20_000)
})

async function startRemoteServer(root: string) {
  return await startStandaloneServer({
    root,
    envOverrides: {
      HOST: '0.0.0.0',
      NO_OPEN_BROWSER: '1',
      TTDASH_ALLOW_REMOTE: '1',
      TTDASH_REMOTE_TOKEN: remoteToken,
    },
    readinessHeaders: {
      Authorization: remoteAuthHeader,
    },
  })
}
