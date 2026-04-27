import { createServer } from 'node:net'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createCliEnv,
  getCliConfigDir,
  getCliDataDir,
  isPosix,
  permissionBits,
  runCli,
  startStandaloneServer,
  stopProcess,
} from './server-test-helpers'

const itIfPosix = isPosix ? it : it.skip

describe('local server startup CLI integration', () => {
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
          TTDASH_REMOTE_TOKEN: 'remote-token-123456789012345',
        },
        readinessHeaders: {
          Authorization: 'Bearer remote-token-123456789012345',
        },
      })

      expect(standaloneServer.getOutput()).toContain('Host:           0.0.0.0')
      expect(standaloneServer.getOutput()).toContain(
        'Exposure:       network-accessible via 0.0.0.0',
      )
      expect(standaloneServer.getOutput()).toContain('Remote Auth:    required')
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
