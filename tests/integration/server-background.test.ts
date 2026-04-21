import { createServer } from 'node:net'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createCliEnv,
  createSharedServerContext,
  getCliDataDir,
  getCliConfigDir,
  getFreePort,
  isPosix,
  permissionBits,
  readBackgroundRegistry,
  registerSharedServerLifecycle,
  runCli,
  startStandaloneServer,
  stopAllBackgroundServers,
  stopProcess,
  waitForBackgroundRegistry,
  waitForHttpOk,
  waitForServerUnavailable,
  waitForUrlAvailable,
  writeBackgroundRegistry,
} from './server-test-helpers'

const sharedServer = createSharedServerContext()
registerSharedServerLifecycle(sharedServer)

const itIfPosix = isPosix ? it : it.skip

describe('local server background and CLI integration', () => {
  itIfPosix(
    'hardens background log files and stops background instances with a custom API prefix',
    async () => {
      const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-prefix-test-'))
      const backgroundEnv = {
        ...createCliEnv(backgroundRoot),
        API_PREFIX: '/custom-api',
      }
      const backgroundPort = await getFreePort()
      const backgroundUrl = `http://127.0.0.1:${backgroundPort}`

      try {
        const startResult = await runCli(
          ['--background', '--no-open', '--port', String(backgroundPort)],
          {
            env: backgroundEnv,
          },
        )
        expect(startResult.code).toBe(0)

        await waitForHttpOk(`${backgroundUrl}/custom-api/usage`)
        const [instance] = await waitForBackgroundRegistry(
          backgroundRoot,
          (entries) => entries.length === 1,
        )
        expect(instance?.apiPrefix).toBe('/custom-api')
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

  it('starts background servers and stops the selected instance via the CLI', async () => {
    const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-test-'))
    const backgroundEnv = createCliEnv(backgroundRoot)
    const firstPort = await getFreePort()
    const secondPort = await getFreePort()
    const firstUrl = `http://127.0.0.1:${firstPort}`
    const secondUrl = `http://127.0.0.1:${secondPort}`

    try {
      const firstStart = await runCli(['--background', '--no-open', '--port', String(firstPort)], {
        env: backgroundEnv,
      })
      expect(firstStart.code).toBe(0)
      await waitForUrlAvailable(firstUrl)

      const secondStart = await runCli(
        ['--background', '--no-open', '--port', String(secondPort)],
        {
          env: backgroundEnv,
        },
      )
      expect(secondStart.code).toBe(0)
      await waitForUrlAvailable(secondUrl)

      const stopSecond = await runCli(['stop'], {
        env: backgroundEnv,
        input: '2\n',
      })
      expect(stopSecond.code).toBe(0)
      await waitForServerUnavailable(secondUrl)

      await waitForBackgroundRegistry(
        backgroundRoot,
        (entries) => entries.some((entry) => entry.url === firstUrl),
        15_000,
      )

      const stopFirst = await runCli(['stop'], {
        env: backgroundEnv,
        input: '1\n',
      })
      expect(stopFirst.code).toBe(0)
      await waitForServerUnavailable(firstUrl)
    } finally {
      await stopAllBackgroundServers(backgroundEnv, backgroundRoot)
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  }, 45_000)

  it('keeps both instances in the registry when background starts happen concurrently', async () => {
    const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-parallel-test-'))
    const backgroundEnv = createCliEnv(backgroundRoot)
    const firstPort = await getFreePort()
    const secondPort = await getFreePort()
    const firstUrl = `http://127.0.0.1:${firstPort}`
    const secondUrl = `http://127.0.0.1:${secondPort}`

    try {
      const [firstStart, secondStart] = await Promise.all([
        runCli(['--background', '--no-open', '--port', String(firstPort)], { env: backgroundEnv }),
        runCli(['--background', '--no-open', '--port', String(secondPort)], { env: backgroundEnv }),
      ])

      expect(firstStart.code).toBe(0)
      expect(secondStart.code).toBe(0)
      await waitForUrlAvailable(firstUrl)
      await waitForUrlAvailable(secondUrl)

      const registry = await waitForBackgroundRegistry(
        backgroundRoot,
        (entries) =>
          entries.length === 2 &&
          [firstUrl, secondUrl].every((url) => entries.some((entry) => entry.url === url)),
        30_000,
      )
      expect(registry).toHaveLength(2)
    } finally {
      await stopAllBackgroundServers(backgroundEnv, backgroundRoot)
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  }, 60_000)

  it('prunes stale background entries that point to a live non-matching process', async () => {
    const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-stale-test-'))
    const backgroundEnv = createCliEnv(backgroundRoot)

    try {
      const runtimeResponse = await fetch(`${sharedServer.baseUrl}/api/runtime`)
      const runtime = await runtimeResponse.json()

      writeBackgroundRegistry(backgroundRoot, [
        {
          id: 'stale-entry',
          pid: sharedServer.child?.pid,
          port: runtime.port,
          url: sharedServer.baseUrl,
          host: '127.0.0.1',
          startedAt: new Date().toISOString(),
          logFile: null,
        },
      ])

      const stopResult = await runCli(['stop'], { env: backgroundEnv })
      expect(stopResult.code).toBe(0)
      expect(readBackgroundRegistry(backgroundRoot)).toEqual([])
    } finally {
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  }, 15_000)

  it('fails cleanly when port 65535 is busy instead of retrying to 65536', async () => {
    const occupiedPortServer = createServer()
    const cliRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-port-limit-test-'))

    try {
      await new Promise<void>((resolve, reject) => {
        occupiedPortServer.once('error', reject)
        occupiedPortServer.listen(65535, '127.0.0.1', () => resolve())
      })

      const result = await runCli(['--port', '65535'], { env: createCliEnv(cliRoot) })
      expect(result.code).toBe(1)
      expect(result.output).toContain('No free port found (65535-65535)')
    } finally {
      await new Promise((resolve) => occupiedPortServer.close(() => resolve(undefined)))
      rmSync(cliRoot, { recursive: true, force: true })
    }
  }, 20_000)

  it('refuses non-loopback binding unless remote access is explicitly allowed', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-remote-bind-test-'))
    try {
      const result = await runCli([], {
        env: {
          ...createCliEnv(runtimeRoot),
          HOST: '0.0.0.0',
          NO_OPEN_BROWSER: '1',
        },
      })
      expect(result.code).toBe(1)
    } finally {
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('warns clearly when binding the server on a non-loopback host with explicit opt-in', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-remote-bind-allowed-test-'))
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: {
          HOST: '0.0.0.0',
          NO_OPEN_BROWSER: '1',
          TTDASH_ALLOW_REMOTE: '1',
        },
      })

      expect(standaloneServer.getOutput()).toContain('Host:           0.0.0.0')
      expect(standaloneServer.getOutput()).toContain(
        'Exposure:       network-accessible via 0.0.0.0',
      )
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  }, 20_000)

  itIfPosix('tightens existing app directories to restrictive permissions on startup', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-existing-dir-permissions-test-'))
    const dataDir = getCliDataDir(runtimeRoot)
    const configDir = getCliConfigDir(runtimeRoot)
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      mkdirSync(dataDir, { recursive: true, mode: 0o755 })
      mkdirSync(configDir, { recursive: true, mode: 0o755 })
      chmodSync(dataDir, 0o755)
      chmodSync(configDir, 0o755)
      standaloneServer = await startStandaloneServer({ root: runtimeRoot })
      expect(existsSync(getCliConfigDir(runtimeRoot))).toBe(true)
      expect(permissionBits(dataDir)).toBe(0o700)
      expect(permissionBits(configDir)).toBe(0o700)
    } finally {
      if (standaloneServer) await stopProcess(standaloneServer.child)
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })
})
