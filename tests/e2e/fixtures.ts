import fs from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { test as base, expect, type Page } from '@playwright/test'

type E2EServer = {
  authSessionPath: string
  authHeader: string
  baseURL: string
  bootstrapUrl: string
  runtimeRoot: string
}

type WorkerFixtures = {
  e2eServer: E2EServer
}

const startupTimeoutMs = 120_000
const host = process.env.PLAYWRIGHT_TEST_HOST || '127.0.0.1'
const basePort = Number(process.env.PLAYWRIGHT_TEST_PORT || '3015')

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildWorkerServer(workerIndex: number) {
  const port = basePort + workerIndex
  const authToken = `ttdash-playwright-local-auth-token-worker-${workerIndex}-port-${port}`
  const authHeader = `Bearer ${authToken}`
  const runtimeRoot = path.join(
    process.cwd(),
    '.tmp-playwright',
    'workers',
    String(workerIndex),
    'app',
  )
  // The session file is only a server-readiness signal; test credentials come from env.
  const authSessionPath = path.join(runtimeRoot, 'config', 'session-auth.json')

  return {
    authSessionPath,
    authHeader,
    baseURL: `http://${host}:${port}`,
    bootstrapUrl: `http://${host}:${port}/?ttdash_token=${encodeURIComponent(authToken)}`,
    env: {
      ...process.env,
      HOST: host,
      NO_OPEN_BROWSER: '1',
      PLAYWRIGHT_TEST_HOST: host,
      PLAYWRIGHT_TEST_PORT: String(port),
      PLAYWRIGHT_TEST_RUNTIME_ROOT: runtimeRoot,
      PORT: String(port),
      TTDASH_LOCAL_AUTH_TOKEN: authToken,
    },
    runtimeRoot,
  }
}

function createOutputBuffer(serverProcess: ChildProcessWithoutNullStreams) {
  let output = ''

  const append = (chunk: Buffer) => {
    output += chunk.toString('utf8')
    if (output.length > 16_000) {
      output = output.slice(-16_000)
    }
  }

  serverProcess.stdout.on('data', append)
  serverProcess.stderr.on('data', append)

  return () => output.trim()
}

async function waitForServerReady(
  serverProcess: ChildProcessWithoutNullStreams,
  baseURL: string,
  authSessionPath: string,
  authHeader: string,
  readOutput: () => string,
) {
  let rejectSpawnError: ((error: Error) => void) | null = null
  const spawnErrorPromise = new Promise<never>((_, reject) => {
    rejectSpawnError = reject
  })
  const onSpawnError = (error: Error) => {
    rejectSpawnError?.(
      new Error(`Playwright server spawn error: ${error.message}\n${readOutput()}`),
    )
  }

  serverProcess.once('error', onSpawnError)

  const readinessPromise = (async () => {
    const deadline = Date.now() + startupTimeoutMs
    let lastError = ''

    while (Date.now() < deadline) {
      if (serverProcess.exitCode !== null) {
        throw new Error(
          `Playwright test server exited with code ${serverProcess.exitCode}.\n${readOutput()}`,
        )
      }

      try {
        const response = await fetch(baseURL, {
          redirect: 'manual',
          signal: AbortSignal.timeout(1_000),
        })

        if (response.status < 400) {
          if (!fs.existsSync(authSessionPath)) {
            lastError = `Waiting for server readiness signal file at ${authSessionPath}`
          } else {
            const apiResponse = await fetch(new URL('/api/usage', baseURL), {
              headers: { Authorization: authHeader },
              signal: AbortSignal.timeout(1_000),
            })

            if (apiResponse.status === 200) {
              return
            }

            lastError = `GET /api/usage returned ${apiResponse.status}`
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
      }

      await sleep(250)
    }

    throw new Error(
      `Timed out waiting for Playwright test server at ${baseURL}. Last error: ${lastError}\n${readOutput()}`,
    )
  })()

  try {
    await Promise.race([spawnErrorPromise, readinessPromise])
  } finally {
    serverProcess.off('error', onSpawnError)
  }
}

async function stopServer(serverProcess: ChildProcessWithoutNullStreams) {
  if (serverProcess.exitCode !== null) {
    return
  }

  const waitForExit = (timeoutMs: number) => {
    if (serverProcess.exitCode !== null) {
      return Promise.resolve(true)
    }

    return new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => {
        cleanup()
        resolve(false)
      }, timeoutMs)

      const cleanup = () => {
        clearTimeout(timeoutId)
        serverProcess.off('exit', onExit)
      }

      const onExit = () => {
        cleanup()
        resolve(true)
      }

      serverProcess.once('exit', onExit)
    })
  }

  serverProcess.kill('SIGTERM')

  const exited = await waitForExit(5_000)

  if (!exited && serverProcess.exitCode === null) {
    serverProcess.kill('SIGKILL')
    await waitForExit(2_000)
  }
}

export const test = base.extend<Record<string, never>, WorkerFixtures>({
  e2eServer: [
    async ({}, runFixture, workerInfo) => {
      const workerServer = buildWorkerServer(workerInfo.parallelIndex)
      fs.rmSync(workerServer.runtimeRoot, { recursive: true, force: true })
      const serverProcess = spawn(process.execPath, ['scripts/start-test-server.js'], {
        cwd: process.cwd(),
        env: workerServer.env,
      })
      const readOutput = createOutputBuffer(serverProcess)
      const previousRuntimeRoot = process.env.PLAYWRIGHT_TEST_RUNTIME_ROOT
      const previousAuthSessionPath = process.env.PLAYWRIGHT_TEST_AUTH_SESSION_PATH
      const previousAuthorizationHeader = process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER
      const previousBootstrapUrl = process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL

      process.env.PLAYWRIGHT_TEST_RUNTIME_ROOT = workerServer.runtimeRoot
      process.env.PLAYWRIGHT_TEST_AUTH_SESSION_PATH = workerServer.authSessionPath
      process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER = workerServer.authHeader
      process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL = workerServer.bootstrapUrl

      try {
        await waitForServerReady(
          serverProcess,
          workerServer.baseURL,
          workerServer.authSessionPath,
          workerServer.authHeader,
          readOutput,
        )
        await runFixture({
          authSessionPath: workerServer.authSessionPath,
          authHeader: workerServer.authHeader,
          baseURL: workerServer.baseURL,
          bootstrapUrl: workerServer.bootstrapUrl,
          runtimeRoot: workerServer.runtimeRoot,
        })
      } finally {
        await stopServer(serverProcess)

        if (previousRuntimeRoot === undefined) {
          delete process.env.PLAYWRIGHT_TEST_RUNTIME_ROOT
        } else {
          process.env.PLAYWRIGHT_TEST_RUNTIME_ROOT = previousRuntimeRoot
        }

        if (previousAuthSessionPath === undefined) {
          delete process.env.PLAYWRIGHT_TEST_AUTH_SESSION_PATH
        } else {
          process.env.PLAYWRIGHT_TEST_AUTH_SESSION_PATH = previousAuthSessionPath
        }

        if (previousAuthorizationHeader === undefined) {
          delete process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER
        } else {
          process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER = previousAuthorizationHeader
        }

        if (previousBootstrapUrl === undefined) {
          delete process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL
        } else {
          process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL = previousBootstrapUrl
        }
      }
    },
    { scope: 'worker', timeout: startupTimeoutMs },
  ],
  baseURL: async ({ e2eServer }, runFixture) => {
    await runFixture(e2eServer.baseURL)
  },
})

export { expect, type Page }
