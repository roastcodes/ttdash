import fs from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { test as base, expect, type Page } from '@playwright/test'

type E2EServer = {
  authSessionPath: string
  baseURL: string
  runtimeRoot: string
}

type WorkerFixtures = {
  e2eServer: E2EServer
}

type LocalAuthSession = {
  authorizationHeader?: unknown
}

const startupTimeoutMs = 120_000
const host = process.env.PLAYWRIGHT_TEST_HOST || '127.0.0.1'
const basePort = Number(process.env.PLAYWRIGHT_TEST_PORT || '3015')

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildWorkerServer(workerIndex: number) {
  const port = basePort + workerIndex
  const runtimeRoot = path.join(
    process.cwd(),
    '.tmp-playwright',
    'workers',
    String(workerIndex),
    'app',
  )
  const authSessionPath = path.join(runtimeRoot, 'config', 'session-auth.json')

  return {
    authSessionPath,
    baseURL: `http://${host}:${port}`,
    env: {
      ...process.env,
      HOST: host,
      NO_OPEN_BROWSER: '1',
      PLAYWRIGHT_TEST_HOST: host,
      PLAYWRIGHT_TEST_PORT: String(port),
      PLAYWRIGHT_TEST_RUNTIME_ROOT: runtimeRoot,
      PORT: String(port),
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

function readApiAuthHeaders(authSessionPath: string) {
  if (!fs.existsSync(authSessionPath)) {
    return null
  }

  const authSession = JSON.parse(fs.readFileSync(authSessionPath, 'utf-8')) as LocalAuthSession

  if (typeof authSession.authorizationHeader !== 'string') {
    throw new Error(
      `Playwright auth session is missing an authorization header: ${authSessionPath}`,
    )
  }

  return {
    Authorization: authSession.authorizationHeader,
  }
}

async function waitForServerReady(
  serverProcess: ChildProcessWithoutNullStreams,
  baseURL: string,
  authSessionPath: string,
  readOutput: () => string,
) {
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

      if (response.status < 400 && fs.existsSync(authSessionPath)) {
        const authHeaders = readApiAuthHeaders(authSessionPath)
        if (authHeaders) {
          const apiResponse = await fetch(new URL('/api/usage', baseURL), {
            headers: authHeaders,
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
}

async function stopServer(serverProcess: ChildProcessWithoutNullStreams) {
  if (serverProcess.exitCode !== null) {
    return
  }

  serverProcess.kill('SIGTERM')

  const exited = await Promise.race([
    new Promise<boolean>((resolve) => serverProcess.once('exit', () => resolve(true))),
    sleep(5_000).then(() => false),
  ])

  if (!exited && serverProcess.exitCode === null) {
    serverProcess.kill('SIGKILL')
  }
}

export const test = base.extend<Record<string, never>, WorkerFixtures>({
  e2eServer: [
    async ({}, runFixture, workerInfo) => {
      const workerServer = buildWorkerServer(workerInfo.parallelIndex)
      const serverProcess = spawn(process.execPath, ['scripts/start-test-server.js'], {
        cwd: process.cwd(),
        env: workerServer.env,
      })
      const readOutput = createOutputBuffer(serverProcess)
      const previousRuntimeRoot = process.env.PLAYWRIGHT_TEST_RUNTIME_ROOT
      const previousAuthSessionPath = process.env.PLAYWRIGHT_TEST_AUTH_SESSION_PATH

      process.env.PLAYWRIGHT_TEST_RUNTIME_ROOT = workerServer.runtimeRoot
      process.env.PLAYWRIGHT_TEST_AUTH_SESSION_PATH = workerServer.authSessionPath

      try {
        await waitForServerReady(
          serverProcess,
          workerServer.baseURL,
          workerServer.authSessionPath,
          readOutput,
        )
        await runFixture({
          authSessionPath: workerServer.authSessionPath,
          baseURL: workerServer.baseURL,
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
      }
    },
    { scope: 'worker', timeout: startupTimeoutMs },
  ],
  baseURL: async ({ e2eServer }, runFixture) => {
    await runFixture(e2eServer.baseURL)
  },
})

export { expect, type Page }
