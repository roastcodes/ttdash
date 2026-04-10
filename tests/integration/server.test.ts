import { createServer } from 'node:net'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import sampleUsage from '../../examples/sample-usage.json'

let child: ChildProcessWithoutNullStreams | null = null
let baseUrl = ''
let tempRoot = ''
let output = ''

async function getFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not resolve free port'))
        return
      }

      const { port } = address
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(port)
      })
    })
  })
}

async function waitForServer(url: string) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 15_000) {
    if (child?.exitCode !== null) {
      throw new Error(`Server exited before becoming ready:\n${output}`)
    }

    try {
      const response = await fetch(`${url}/api/usage`)
      if (response.ok) {
        return
      }
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for server startup:\n${output}`)
}

async function waitForUrlAvailable(url: string) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 15_000) {
    try {
      const response = await fetch(`${url}/api/usage`)
      if (response.ok) {
        return
      }
    } catch {}

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for server startup: ${url}`)
}

async function waitForServerUnavailable(url: string) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 15_000) {
    try {
      await fetch(`${url}/api/usage`)
    } catch {
      return
    }

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for server shutdown: ${url}`)
}

function createCliEnv(root: string) {
  return {
    ...process.env,
    HOME: root,
    HOST: '127.0.0.1',
    NO_OPEN_BROWSER: '1',
    XDG_CACHE_HOME: path.join(root, 'cache'),
    XDG_CONFIG_HOME: path.join(root, 'config'),
    XDG_DATA_HOME: path.join(root, 'data'),
  }
}

function getCliConfigDir(root: string) {
  if (process.platform === 'darwin') {
    return path.join(root, 'Library', 'Application Support', 'TTDash')
  }

  if (process.platform === 'win32') {
    return path.join(root, 'AppData', 'Roaming', 'TTDash')
  }

  return path.join(root, 'config', 'ttdash')
}

function readBackgroundRegistry(root: string) {
  const registryPath = path.join(getCliConfigDir(root), 'background-instances.json')
  return JSON.parse(readFileSync(registryPath, 'utf-8')) as Array<{ url: string, port: number, pid: number }>
}

async function runCli(args: string[], { env, input }: { env: NodeJS.ProcessEnv, input?: string }) {
  return await new Promise<{ code: number | null, output: string }>((resolve, reject) => {
    const cli = spawn(process.execPath, ['server.js', ...args], {
      cwd: process.cwd(),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let cliOutput = ''

    cli.stdout.on('data', chunk => {
      cliOutput += chunk.toString()
    })

    cli.stderr.on('data', chunk => {
      cliOutput += chunk.toString()
    })

    cli.on('error', reject)
    cli.on('close', code => {
      resolve({ code, output: cliOutput })
    })

    if (input) {
      cli.stdin.write(input)
    }
    cli.stdin.end()
  })
}

async function stopAllBackgroundServers(env: NodeJS.ProcessEnv) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await runCli(['stop'], {
      env,
      input: '1\n',
    })

    if (result.output.includes('Keine laufenden TTDash-Background-Server gefunden.')) {
      return
    }
  }
}

beforeAll(async () => {
  const port = await getFreePort()
  baseUrl = `http://127.0.0.1:${port}`
  tempRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-server-test-'))

  child = spawn(process.execPath, ['server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOME: tempRoot,
      HOST: '127.0.0.1',
      NO_OPEN_BROWSER: '1',
      PORT: String(port),
      XDG_CACHE_HOME: path.join(tempRoot, 'cache'),
      XDG_CONFIG_HOME: path.join(tempRoot, 'config'),
      XDG_DATA_HOME: path.join(tempRoot, 'data'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', chunk => {
    output += chunk.toString()
  })

  child.stderr.on('data', chunk => {
    output += chunk.toString()
  })

  await waitForServer(baseUrl)
}, 20_000)

afterAll(() => {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM')
  }

  if (tempRoot) {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

describe('local server API', () => {
  it('serves the upload, usage, settings, and delete flow against real persisted files', async () => {
    const initialUsageResponse = await fetch(`${baseUrl}/api/usage`)
    expect(initialUsageResponse.status).toBe(200)
    expect(await initialUsageResponse.json()).toEqual({
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

    const initialSettingsResponse = await fetch(`${baseUrl}/api/settings`)
    expect(initialSettingsResponse.status).toBe(200)
    expect(await initialSettingsResponse.json()).toMatchObject({
      language: 'de',
      theme: 'dark',
      providerLimits: {},
      lastLoadedAt: null,
      lastLoadSource: null,
      cliAutoLoadActive: false,
    })

    const uploadResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })

    expect(uploadResponse.status).toBe(200)
    const uploadBody = await uploadResponse.json()
    expect(uploadBody.days).toBe(5)
    expect(uploadBody.totalCost).toBeCloseTo(19.87, 6)

    const usageResponse = await fetch(`${baseUrl}/api/usage`)
    const usageBody = await usageResponse.json()
    expect(usageResponse.status).toBe(200)
    expect(usageBody.daily).toHaveLength(5)
    expect(usageBody.totals.totalCost).toBeCloseTo(19.87, 6)

    const afterUploadSettingsResponse = await fetch(`${baseUrl}/api/settings`)
    const afterUploadSettings = await afterUploadSettingsResponse.json()
    expect(afterUploadSettings.lastLoadSource).toBe('file')
    expect(afterUploadSettings.lastLoadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const patchResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'en',
        theme: 'light',
        providerLimits: {
          OpenAI: {
            hasSubscription: true,
            subscriptionPrice: 19.999,
            monthlyLimit: 500.555,
          },
        },
      }),
    })

    expect(patchResponse.status).toBe(200)
    expect(await patchResponse.json()).toMatchObject({
      language: 'en',
      theme: 'light',
      providerLimits: {
        OpenAI: {
          hasSubscription: true,
          subscriptionPrice: 20,
          monthlyLimit: 500.56,
        },
      },
      cliAutoLoadActive: false,
    })

    const deleteResponse = await fetch(`${baseUrl}/api/usage`, {
      method: 'DELETE',
    })
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({ success: true })

    const finalUsageResponse = await fetch(`${baseUrl}/api/usage`)
    const finalUsage = await finalUsageResponse.json()
    expect(finalUsage.daily).toEqual([])
    expect(finalUsage.totals.totalCost).toBe(0)

    const finalSettingsResponse = await fetch(`${baseUrl}/api/settings`)
    expect(await finalSettingsResponse.json()).toMatchObject({
      language: 'en',
      theme: 'light',
      lastLoadedAt: null,
      lastLoadSource: null,
    })
  })

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
      expect(firstStart.output).toContain('TTDash läuft im Hintergrund.')
      expect(firstStart.output).toContain(firstUrl)
      await waitForUrlAvailable(firstUrl)

      const secondStart = await runCli(['--background', '--no-open', '--port', String(secondPort)], {
        env: backgroundEnv,
      })

      expect(secondStart.code).toBe(0)
      expect(secondStart.output).toContain('TTDash läuft im Hintergrund.')
      expect(secondStart.output).toContain(secondUrl)
      await waitForUrlAvailable(secondUrl)

      const stopSecond = await runCli(['stop'], {
        env: backgroundEnv,
        input: '2\n',
      })

      expect(stopSecond.code).toBe(0)
      expect(stopSecond.output).toContain('Mehrere TTDash-Background-Server laufen:')
      expect(stopSecond.output).toContain(firstUrl)
      expect(stopSecond.output).toContain(secondUrl)
      expect(stopSecond.output).toContain(`TTDash-Background-Server beendet: ${secondUrl}`)

      const firstUsageResponse = await fetch(`${firstUrl}/api/usage`)
      expect(firstUsageResponse.status).toBe(200)
      await waitForServerUnavailable(secondUrl)

      const stopFirst = await runCli(['stop'], {
        env: backgroundEnv,
      })

      expect(stopFirst.code).toBe(0)
      expect(stopFirst.output).toContain(`TTDash-Background-Server beendet: ${firstUrl}`)
      await waitForServerUnavailable(firstUrl)
    } finally {
      await stopAllBackgroundServers(backgroundEnv)
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
        runCli(['--background', '--no-open', '--port', String(firstPort)], {
          env: backgroundEnv,
        }),
        runCli(['--background', '--no-open', '--port', String(secondPort)], {
          env: backgroundEnv,
        }),
      ])

      expect(firstStart.code).toBe(0)
      expect(secondStart.code).toBe(0)
      expect(firstStart.output).toContain('TTDash läuft im Hintergrund.')
      expect(secondStart.output).toContain('TTDash läuft im Hintergrund.')

      await waitForUrlAvailable(firstUrl)
      await waitForUrlAvailable(secondUrl)

      const registry = readBackgroundRegistry(backgroundRoot)
      expect(registry).toHaveLength(2)
      expect(registry.map(instance => instance.url).sort()).toEqual([firstUrl, secondUrl].sort())
    } finally {
      await stopAllBackgroundServers(backgroundEnv)
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  }, 45_000)
})
