import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { createAuthHeaders, readAuthStatus, waitForServer } =
  require('../../scripts/capture-readme-screenshots.js') as {
    createAuthHeaders: (authSession: { authorizationHeader?: string } | null) => HeadersInit
    readAuthStatus: (filePath: string) => {
      authorizationHeader: string
      bootstrapUrl: string
    } | null
    waitForServer: (
      url: string,
      options: {
        authStatusFile?: string
        fetchImpl?: typeof fetch
        pollMs?: number
        readAuthStatusImpl?: (filePath?: string) => {
          authorizationHeader: string
          bootstrapUrl: string
        } | null
        sleepImpl?: (ms: number) => Promise<void>
        timeoutMs?: number
      },
    ) => Promise<{ authorizationHeader: string; bootstrapUrl: string } | null>
  }

const tempDirs: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()

  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function createTempDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'ttdash-screenshots-'))
  tempDirs.push(dir)
  return dir
}

describe('README screenshot script helpers', () => {
  it('reads the local auth status file written by the test server', async () => {
    const dir = await createTempDir()
    const authStatusPath = path.join(dir, 'auth-status.json')

    await writeFile(
      authStatusPath,
      JSON.stringify({
        authorizationHeader: 'Bearer local-token',
        bootstrapUrl: 'http://127.0.0.1:3018/?ttdash_token=local-token',
      }),
    )

    expect(readAuthStatus(authStatusPath)).toEqual({
      authorizationHeader: 'Bearer local-token',
      bootstrapUrl: 'http://127.0.0.1:3018/?ttdash_token=local-token',
    })
  })

  it('uses the auth status header while polling the protected usage API', async () => {
    const fetchImpl = vi.fn(async (_url: string, options?: RequestInit) => {
      const authorization = new Headers(options?.headers).get('Authorization')
      return new Response('{}', {
        status: authorization === 'Bearer local-token' ? 200 : 401,
      })
    }) as typeof fetch
    const authSession = {
      authorizationHeader: 'Bearer local-token',
      bootstrapUrl: 'http://127.0.0.1:3018/?ttdash_token=local-token',
    }

    await expect(
      waitForServer('http://127.0.0.1:3018', {
        fetchImpl,
        pollMs: 0,
        readAuthStatusImpl: () => authSession,
        sleepImpl: async () => {},
        timeoutMs: 1000,
      }),
    ).resolves.toEqual(authSession)

    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:3018/api/usage', {
      headers: { Authorization: 'Bearer local-token' },
    })
  })

  it('omits auth headers until a local auth session exists', () => {
    expect(createAuthHeaders(null)).toBeUndefined()
    expect(createAuthHeaders({ authorizationHeader: '' })).toBeUndefined()
  })
})
