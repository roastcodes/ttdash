import { createConnection, createServer } from 'node:net'
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import sampleUsage from '../../examples/sample-usage.json'
import {
  DEFAULT_DASHBOARD_FILTERS,
  getDefaultDashboardSectionOrder,
} from '@/lib/dashboard-preferences'

let child: ChildProcessWithoutNullStreams | null = null
let baseUrl = ''
let tempRoot = ''
let output = ''
const hasTypst = (() => {
  const result = spawnSync('typst', ['--version'], { stdio: 'ignore' })
  return !result.error && result.status === 0
})()
const itIfTypst = hasTypst ? it : it.skip
const itIfPosix = process.platform === 'win32' ? it.skip : it

function permissionBits(targetPath: string) {
  return statSync(targetPath).mode & 0o777
}

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

    await new Promise((resolve) => setTimeout(resolve, 200))
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

    await new Promise((resolve) => setTimeout(resolve, 200))
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

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for server shutdown: ${url}`)
}

async function waitForProcessServer(
  currentChild: ChildProcessWithoutNullStreams,
  url: string,
  getOutput: () => string,
  readinessPath = '/api/usage',
) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 15_000) {
    if (currentChild.exitCode !== null) {
      throw new Error(`Server exited before becoming ready:\n${getOutput()}`)
    }

    try {
      const response = await fetch(`${url}${readinessPath}`)
      if (response.ok) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for server startup:\n${getOutput()}`)
}

async function stopProcess(currentChild: ChildProcessWithoutNullStreams) {
  if (currentChild.exitCode !== null) {
    return
  }

  currentChild.kill('SIGTERM')
  await new Promise((resolve) => currentChild.once('close', resolve))
}

function createCliEnv(root: string) {
  return {
    ...process.env,
    HOME: root,
    USERPROFILE: root,
    APPDATA: path.join(root, 'AppData', 'Roaming'),
    LOCALAPPDATA: path.join(root, 'AppData', 'Local'),
    HOST: '127.0.0.1',
    NO_OPEN_BROWSER: '1',
    XDG_CACHE_HOME: path.join(root, 'cache'),
    XDG_CONFIG_HOME: path.join(root, 'config'),
    XDG_DATA_HOME: path.join(root, 'data'),
  }
}

async function startStandaloneServer({
  root,
  args = [],
  envOverrides = {},
  readinessPath = '/api/usage',
}: {
  root: string
  args?: string[]
  envOverrides?: NodeJS.ProcessEnv
  readinessPath?: string
}) {
  const port = Number(envOverrides.PORT) || (await getFreePort())
  const url = `http://127.0.0.1:${port}`
  let serverOutput = ''

  const currentChild = spawn(process.execPath, ['server.js', ...args], {
    cwd: process.cwd(),
    env: {
      ...createCliEnv(root),
      PORT: String(port),
      ...envOverrides,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  currentChild.stdout.on('data', (chunk) => {
    serverOutput += chunk.toString()
  })

  currentChild.stderr.on('data', (chunk) => {
    serverOutput += chunk.toString()
  })

  await waitForProcessServer(currentChild, url, () => serverOutput, readinessPath)

  return {
    child: currentChild,
    url,
    port,
    getOutput: () => serverOutput,
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

function getCliDataDir(root: string) {
  if (process.platform === 'darwin') {
    return path.join(root, 'Library', 'Application Support', 'TTDash')
  }

  if (process.platform === 'win32') {
    return path.join(root, 'AppData', 'Local', 'TTDash')
  }

  return path.join(root, 'data', 'ttdash')
}

async function sendRawHttpRequest(port: number, request: string) {
  return await new Promise<string>((resolve, reject) => {
    const socket = createConnection(port, '127.0.0.1')
    let response = ''

    socket.on('connect', () => {
      socket.write(request)
    })
    socket.on('data', (chunk) => {
      response += chunk.toString()
    })
    socket.on('end', () => {
      resolve(response)
    })
    socket.on('error', reject)
  })
}

function readBackgroundRegistry(root: string) {
  const registryPath = path.join(getCliConfigDir(root), 'background-instances.json')
  return JSON.parse(readFileSync(registryPath, 'utf-8')) as Array<{
    url: string
    port: number
    pid: number
    logFile?: string | null
  }>
}

function tryReadBackgroundRegistry(root: string) {
  const registryPath = path.join(getCliConfigDir(root), 'background-instances.json')
  if (!existsSync(registryPath)) {
    return [] as Array<{
      url: string
      port: number
      pid: number
      logFile?: string | null
    }>
  }

  try {
    return JSON.parse(readFileSync(registryPath, 'utf-8')) as Array<{
      url: string
      port: number
      pid: number
      logFile?: string | null
    }>
  } catch {
    return []
  }
}

function writeBackgroundRegistry(root: string, entries: unknown) {
  const registryPath = path.join(getCliConfigDir(root), 'background-instances.json')
  mkdirSync(path.dirname(registryPath), { recursive: true })
  writeFileSync(registryPath, JSON.stringify(entries, null, 2))
}

async function waitForBackgroundRegistry(
  root: string,
  predicate: (
    entries: Array<{
      url: string
      port: number
      pid: number
      logFile?: string | null
    }>,
  ) => boolean,
  timeoutMs = 15_000,
) {
  const startedAt = Date.now()
  let lastEntries = tryReadBackgroundRegistry(root)

  while (Date.now() - startedAt < timeoutMs) {
    lastEntries = tryReadBackgroundRegistry(root)
    if (predicate(lastEntries)) {
      return lastEntries
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(
    `Timed out waiting for background registry state: ${JSON.stringify(lastEntries, null, 2)}`,
  )
}

async function waitForHttpOk(url: string, timeoutMs = 15_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for server startup: ${url}`)
}

async function runCli(args: string[], { env, input }: { env: NodeJS.ProcessEnv; input?: string }) {
  return await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const cli = spawn(process.execPath, ['server.js', ...args], {
      cwd: process.cwd(),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let cliOutput = ''

    cli.stdout.on('data', (chunk) => {
      cliOutput += chunk.toString()
    })

    cli.stderr.on('data', (chunk) => {
      cliOutput += chunk.toString()
    })

    cli.on('error', reject)
    cli.on('close', (code) => {
      resolve({ code, output: cliOutput })
    })

    if (input) {
      cli.stdin.write(input)
    }
    cli.stdin.end()
  })
}

async function stopAllBackgroundServers(env: NodeJS.ProcessEnv, root?: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (root) {
      const existingEntries = tryReadBackgroundRegistry(root)
      if (existingEntries.length === 0) {
        return
      }
    }

    const result = await runCli(['stop'], {
      env,
      input: '1\n',
    })

    if (root) {
      const entriesAfterStop = tryReadBackgroundRegistry(root)
      if (entriesAfterStop.length === 0) {
        await waitForBackgroundRegistry(root, (entries) => entries.length === 0)
        return
      }
    } else if (result.output.includes('No running TTDash background servers found.')) {
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

  child.stdout.on('data', (chunk) => {
    output += chunk.toString()
  })

  child.stderr.on('data', (chunk) => {
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
      reducedMotionPreference: 'system',
      providerLimits: {},
      defaultFilters: DEFAULT_DASHBOARD_FILTERS,
      sectionVisibility: {
        insights: true,
        metrics: true,
        today: true,
        currentMonth: true,
        activity: true,
        forecastCache: true,
        limits: true,
        costAnalysis: true,
        tokenAnalysis: true,
        requestAnalysis: true,
        advancedAnalysis: true,
        comparisons: true,
        tables: true,
      },
      sectionOrder: getDefaultDashboardSectionOrder(),
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
        reducedMotionPreference: 'always',
        providerLimits: {
          OpenAI: {
            hasSubscription: true,
            subscriptionPrice: 19.999,
            monthlyLimit: 500.555,
          },
        },
        defaultFilters: {
          viewMode: 'monthly',
          datePreset: '30d',
          providers: ['OpenAI'],
          models: ['GPT-5.4'],
        },
        sectionVisibility: {
          tokenAnalysis: false,
          comparisons: false,
        },
        sectionOrder: ['metrics', 'insights', 'today'],
      }),
    })

    expect(patchResponse.status).toBe(200)
    expect(await patchResponse.json()).toMatchObject({
      language: 'en',
      theme: 'light',
      reducedMotionPreference: 'always',
      providerLimits: {
        OpenAI: {
          hasSubscription: true,
          subscriptionPrice: 20,
          monthlyLimit: 500.56,
        },
      },
      defaultFilters: {
        viewMode: 'monthly',
        datePreset: '30d',
        providers: ['OpenAI'],
        models: ['GPT-5.4'],
      },
      sectionVisibility: {
        tokenAnalysis: false,
        comparisons: false,
        insights: true,
      },
      sectionOrder: [
        'metrics',
        'insights',
        'today',
        'currentMonth',
        'activity',
        'forecastCache',
        'limits',
        'costAnalysis',
        'tokenAnalysis',
        'requestAnalysis',
        'advancedAnalysis',
        'comparisons',
        'tables',
      ],
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
    const finalSettings = await finalSettingsResponse.json()
    expect(finalSettings).toMatchObject({
      language: 'en',
      theme: 'light',
      reducedMotionPreference: 'always',
      defaultFilters: {
        viewMode: 'monthly',
        datePreset: '30d',
        providers: ['OpenAI'],
        models: ['GPT-5.4'],
      },
      sectionVisibility: {
        tokenAnalysis: false,
        comparisons: false,
      },
      lastLoadedAt: null,
      lastLoadSource: null,
    })
    expect(finalSettings.sectionOrder.slice(0, 3)).toEqual(['metrics', 'insights', 'today'])
  })

  it('rejects cross-site mutation requests, enforces JSON bodies, and blocks auto-import GET requests', async () => {
    const wrongContentTypeResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(sampleUsage),
    })
    expect(wrongContentTypeResponse.status).toBe(415)
    expect(await wrongContentTypeResponse.json()).toEqual({
      message: 'Content-Type must be application/json',
    })

    const crossSiteUploadResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify(sampleUsage),
    })
    expect(crossSiteUploadResponse.status).toBe(403)
    expect(await crossSiteUploadResponse.json()).toEqual({
      message: 'Cross-site requests are not allowed',
    })

    const crossSiteDeleteResponse = await fetch(`${baseUrl}/api/usage`, {
      method: 'DELETE',
      headers: {
        Origin: 'https://evil.example',
      },
    })
    expect(crossSiteDeleteResponse.status).toBe(403)
    expect(await crossSiteDeleteResponse.json()).toEqual({
      message: 'Cross-site requests are not allowed',
    })

    const autoImportGetResponse = await fetch(`${baseUrl}/api/auto-import/stream`)
    expect(autoImportGetResponse.status).toBe(405)
    expect(await autoImportGetResponse.json()).toEqual({
      message: 'Method Not Allowed',
    })
  })

  it('streams auto-import events over POST instead of mutating via GET', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-auto-import-post-test-'))
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: {
          PATH: '',
        },
      })

      const streamResponse = await fetch(`${standaloneServer.url}/api/auto-import/stream`, {
        method: 'POST',
      })

      expect(streamResponse.status).toBe(200)
      expect(streamResponse.headers.get('content-type')).toContain('text/event-stream')

      const streamBody = await streamResponse.text()
      expect(streamBody).toContain('event: check')
      expect(streamBody).toContain('event: progress')
      expect(streamBody).toContain('event: error')
      expect(streamBody).toContain('event: done')
    } finally {
      if (standaloneServer) {
        await stopProcess(standaloneServer.child)
      }
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  itIfPosix(
    'streams a structured invalid-JSON auto-import error when toktrack output is malformed',
    async () => {
      const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-auto-import-invalid-json-'))
      const fakeToktrackPath = path.join(runtimeRoot, 'fake-toktrack')
      let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

      writeFileSync(
        fakeToktrackPath,
        [
          '#!/bin/sh',
          'if [ "$1" = "--version" ]; then',
          '  echo "toktrack 2.5.0"',
          '  exit 0',
          'fi',
          'echo "{invalid json"',
          'exit 0',
        ].join('\n'),
      )
      chmodSync(fakeToktrackPath, 0o755)

      try {
        standaloneServer = await startStandaloneServer({
          root: runtimeRoot,
          envOverrides: {
            PATH: '',
            TTDASH_TOKTRACK_LOCAL_BIN: fakeToktrackPath,
          },
        })

        const streamResponse = await fetch(`${standaloneServer.url}/api/auto-import/stream`, {
          method: 'POST',
        })

        expect(streamResponse.status).toBe(200)
        const streamBody = await streamResponse.text()
        expect(streamBody).toContain('event: error')
        expect(streamBody).toContain('"key":"toktrackInvalidJson"')
        expect(streamBody).toContain('event: done')
      } finally {
        if (standaloneServer) {
          await stopProcess(standaloneServer.child)
        }
        rmSync(runtimeRoot, { recursive: true, force: true })
      }
    },
  )

  it('serves the API only from the configured API prefix', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-api-prefix-test-'))
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: {
          API_PREFIX: '/custom-api',
        },
        readinessPath: '/custom-api/usage',
      })

      const customPrefixResponse = await fetch(`${standaloneServer.url}/custom-api/usage`)
      expect(customPrefixResponse.status).toBe(200)

      const defaultPrefixResponse = await fetch(`${standaloneServer.url}/api/usage`)
      expect(defaultPrefixResponse.status).toBe(404)
      expect(await defaultPrefixResponse.json()).toEqual({ message: 'Not Found' })
    } finally {
      if (standaloneServer) {
        await stopProcess(standaloneServer.child)
      }
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  itIfPosix('writes persisted data and settings with restrictive local permissions', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-permissions-test-'))
    const dataFile = path.join(getCliDataDir(runtimeRoot), 'data.json')
    const settingsFile = path.join(getCliConfigDir(runtimeRoot), 'settings.json')
    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
      })

      const uploadResponse = await fetch(`${standaloneServer.url}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleUsage),
      })
      expect(uploadResponse.status).toBe(200)

      const settingsResponse = await fetch(`${standaloneServer.url}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'en',
        }),
      })
      expect(settingsResponse.status).toBe(200)

      expect(permissionBits(path.dirname(dataFile))).toBe(0o700)
      expect(permissionBits(path.dirname(settingsFile))).toBe(0o700)
      expect(permissionBits(dataFile)).toBe(0o600)
      expect(permissionBits(settingsFile)).toBe(0o600)
    } finally {
      if (standaloneServer) {
        await stopProcess(standaloneServer.child)
      }
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

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
        expect(startResult.output).toContain('TTDash is running in the background.')
        expect(startResult.output).toContain(backgroundUrl)

        await waitForHttpOk(`${backgroundUrl}/custom-api/usage`)

        const [instance] = await waitForBackgroundRegistry(
          backgroundRoot,
          (entries) => entries.length === 1,
        )
        expect(instance).toBeDefined()
        expect(instance?.logFile).toBeTruthy()
        expect(permissionBits(instance!.logFile!)).toBe(0o600)

        const stopResult = await runCli(['stop'], {
          env: backgroundEnv,
        })

        expect(stopResult.code).toBe(0)
        expect(stopResult.output).toContain(`Stopped TTDash background server: ${backgroundUrl}`)
        await waitForServerUnavailable(backgroundUrl)
      } finally {
        await stopAllBackgroundServers(backgroundEnv, backgroundRoot)
        rmSync(backgroundRoot, { recursive: true, force: true })
      }
    },
    45_000,
  )

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

      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
      })

      expect(permissionBits(dataDir)).toBe(0o700)
      expect(permissionBits(configDir)).toBe(0o700)
    } finally {
      if (standaloneServer) {
        await stopProcess(standaloneServer.child)
      }
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

  it('imports settings backups and merges usage backups without overwriting conflicting local days', async () => {
    const seedResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    expect(seedResponse.status).toBe(200)

    const settingsImportResponse = await fetch(`${baseUrl}/api/settings/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'ttdash-settings-backup',
        version: 1,
        settings: {
          language: 'de',
          theme: 'light',
          reducedMotionPreference: 'never',
          providerLimits: {
            Anthropic: {
              hasSubscription: true,
              subscriptionPrice: 21.499,
              monthlyLimit: 300.111,
            },
          },
          defaultFilters: {
            viewMode: 'yearly',
            datePreset: 'year',
            providers: ['Anthropic'],
            models: ['Claude Sonnet 4.5'],
          },
          sectionVisibility: {
            tables: false,
            advancedAnalysis: false,
          },
          sectionOrder: ['tables', 'metrics', 'insights'],
          lastLoadedAt: '2026-04-01T12:30:00.000Z',
          lastLoadSource: 'file',
        },
      }),
    })

    expect(settingsImportResponse.status).toBe(200)
    expect(await settingsImportResponse.json()).toMatchObject({
      language: 'de',
      theme: 'light',
      reducedMotionPreference: 'never',
      providerLimits: {
        Anthropic: {
          hasSubscription: true,
          subscriptionPrice: 21.5,
          monthlyLimit: 300.11,
        },
      },
      defaultFilters: {
        viewMode: 'yearly',
        datePreset: 'year',
        providers: ['Anthropic'],
        models: ['Claude Sonnet 4.5'],
      },
      sectionVisibility: {
        tables: false,
        advancedAnalysis: false,
        insights: true,
      },
      sectionOrder: [
        'tables',
        'metrics',
        'insights',
        'today',
        'currentMonth',
        'activity',
        'forecastCache',
        'limits',
        'costAnalysis',
        'tokenAnalysis',
        'requestAnalysis',
        'advancedAnalysis',
        'comparisons',
      ],
      lastLoadedAt: '2026-04-01T12:30:00.000Z',
      lastLoadSource: 'file',
      cliAutoLoadActive: false,
    })

    const newImportedDay = {
      ...sampleUsage.daily[0],
      date: '2026-03-31',
    }

    const usageImportResponse = await fetch(`${baseUrl}/api/usage/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'ttdash-usage-backup',
        version: 1,
        data: {
          daily: [
            sampleUsage.daily[0],
            {
              ...sampleUsage.daily[1],
              totalCost: 999,
              modelBreakdowns: sampleUsage.daily[1].modelBreakdowns.map((entry, index) =>
                index === 0 ? { ...entry, cost: 997 } : entry,
              ),
            },
            newImportedDay,
          ],
        },
      }),
    })

    expect(usageImportResponse.status).toBe(200)
    expect(await usageImportResponse.json()).toEqual({
      importedDays: 3,
      addedDays: 1,
      unchangedDays: 1,
      conflictingDays: 1,
      totalDays: 6,
    })

    const mergedUsageResponse = await fetch(`${baseUrl}/api/usage`)
    expect(mergedUsageResponse.status).toBe(200)
    const mergedUsage = await mergedUsageResponse.json()
    expect(mergedUsage.daily).toHaveLength(6)
    expect(mergedUsage.daily[0].date).toBe('2026-03-31')
    expect(
      mergedUsage.daily.find((day: { date: string }) => day.date === '2026-04-02')?.totalCost,
    ).toBeCloseTo(3.94, 6)

    const mergedSettingsResponse = await fetch(`${baseUrl}/api/settings`)
    expect(mergedSettingsResponse.status).toBe(200)
    const mergedSettings = await mergedSettingsResponse.json()
    expect(mergedSettings).toMatchObject({
      theme: 'light',
      language: 'de',
      reducedMotionPreference: 'never',
      defaultFilters: {
        viewMode: 'yearly',
        datePreset: 'year',
        providers: ['Anthropic'],
        models: ['Claude Sonnet 4.5'],
      },
      sectionVisibility: {
        tables: false,
        advancedAnalysis: false,
      },
      lastLoadSource: 'file',
    })
    expect(mergedSettings.sectionOrder.slice(0, 3)).toEqual(['tables', 'metrics', 'insights'])
  })

  it('rejects unrelated JSON and wrong backup types for settings import', async () => {
    const invalidPayloadResponse = await fetch(`${baseUrl}/api/settings/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        foo: 'bar',
      }),
    })

    expect(invalidPayloadResponse.status).toBe(400)
    expect(await invalidPayloadResponse.json()).toEqual({
      message: 'Uploaded JSON is not a settings backup file.',
    })

    const invalidSettingsPayloadResponse = await fetch(`${baseUrl}/api/settings/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'ttdash-settings-backup',
        version: 1,
        settings: [],
      }),
    })

    expect(invalidSettingsPayloadResponse.status).toBe(400)
    expect(await invalidSettingsPayloadResponse.json()).toEqual({
      message: 'The settings backup file has an invalid settings payload.',
    })

    const usageBackupResponse = await fetch(`${baseUrl}/api/settings/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'ttdash-usage-backup',
        version: 1,
        data: sampleUsage,
      }),
    })

    expect(usageBackupResponse.status).toBe(400)
    expect(await usageBackupResponse.json()).toEqual({
      message: 'This is a data backup file, not a settings file.',
    })

    const settingsBackupResponse = await fetch(`${baseUrl}/api/usage/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'ttdash-settings-backup',
        version: 1,
        settings: {
          language: 'en',
        },
      }),
    })

    expect(settingsBackupResponse.status).toBe(400)
    expect(await settingsBackupResponse.json()).toEqual({
      message: 'This is a settings backup file, not a data file.',
    })
  })

  it('resets persisted settings to defaults via DELETE /api/settings', async () => {
    const patchResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'en',
        theme: 'light',
        reducedMotionPreference: 'always',
        sectionVisibility: {
          tokenAnalysis: false,
        },
        sectionOrder: ['tables', 'metrics', 'insights'],
      }),
    })

    expect(patchResponse.status).toBe(200)

    const deleteResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'DELETE',
    })

    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toMatchObject({
      success: true,
      settings: {
        language: 'de',
        theme: 'dark',
        reducedMotionPreference: 'system',
        providerLimits: {},
        defaultFilters: DEFAULT_DASHBOARD_FILTERS,
        sectionOrder: getDefaultDashboardSectionOrder(),
        lastLoadedAt: null,
        lastLoadSource: null,
        cliAutoLoadActive: false,
      },
    })

    const settingsResponse = await fetch(`${baseUrl}/api/settings`)
    expect(settingsResponse.status).toBe(200)
    expect(await settingsResponse.json()).toMatchObject({
      language: 'de',
      theme: 'dark',
      reducedMotionPreference: 'system',
      providerLimits: {},
      defaultFilters: DEFAULT_DASHBOARD_FILTERS,
      sectionOrder: getDefaultDashboardSectionOrder(),
      lastLoadedAt: null,
      lastLoadSource: null,
      cliAutoLoadActive: false,
    })
  })

  it('rejects report generation when no usage data exists', async () => {
    await fetch(`${baseUrl}/api/usage`, {
      method: 'DELETE',
    })

    const response = await fetch(`${baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewMode: 'daily' }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      message: 'No data available for the report.',
    })
  })

  itIfTypst('generates a PDF report for valid requests', async () => {
    const seedResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    expect(seedResponse.status).toBe(200)

    const response = await fetch(`${baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewMode: 'daily',
        language: 'en',
        selectedProviders: ['OpenAI'],
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/pdf')
    expect(response.headers.get('content-disposition')).toContain('ttdash-report-')

    const pdf = Buffer.from(await response.arrayBuffer())
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(1000)

    const pdfText = pdf.toString('latin1')
    expect(pdfText).toContain('/StructTreeRoot')
    expect(pdfText).toContain('/Figure')
    expect(pdfText).toContain('/Title')
    expect(pdfText).toContain('/Alt')
  })

  it('rejects malformed report payloads before report generation starts', async () => {
    const seedResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    expect(seedResponse.status).toBe(200)

    const response = await fetch(`${baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"viewMode":"daily"',
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      message: 'Invalid report request',
    })
  })

  it('returns 400 for malformed request paths without crashing the server', async () => {
    const port = Number(new URL(baseUrl).port)
    const rawResponse = await sendRawHttpRequest(
      port,
      'GET /%E0%A4%A HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n',
    )

    expect(rawResponse.startsWith('HTTP/1.1 400 Bad Request')).toBe(true)
    expect(rawResponse).toContain('{"message":"Invalid request path"}')

    const usageResponse = await fetch(`${baseUrl}/api/usage`)
    expect(usageResponse.status).toBe(200)
  })

  it('returns 413 for oversized upload payloads instead of resetting the connection', async () => {
    const oversizedPayload = `"${'a'.repeat(11 * 1024 * 1024)}"`

    const response = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedPayload,
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      message: 'File too large (max. 10 MB)',
    })

    const usageResponse = await fetch(`${baseUrl}/api/usage`)
    expect(usageResponse.status).toBe(200)
  })

  it('returns 413 for oversized report payloads instead of resetting the connection', async () => {
    const seedResponse = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    expect(seedResponse.status).toBe(200)

    const oversizedPayload = `"${'a'.repeat(11 * 1024 * 1024)}"`
    const response = await fetch(`${baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedPayload,
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      message: 'Report request too large',
    })

    const usageResponse = await fetch(`${baseUrl}/api/usage`)
    expect(usageResponse.status).toBe(200)
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
      expect(firstStart.output).toContain('TTDash is running in the background.')
      expect(firstStart.output).toContain(firstUrl)
      await waitForUrlAvailable(firstUrl)

      const secondStart = await runCli(
        ['--background', '--no-open', '--port', String(secondPort)],
        {
          env: backgroundEnv,
        },
      )

      expect(secondStart.code).toBe(0)
      expect(secondStart.output).toContain('TTDash is running in the background.')
      expect(secondStart.output).toContain(secondUrl)
      await waitForUrlAvailable(secondUrl)

      const stopSecond = await runCli(['stop'], {
        env: backgroundEnv,
        input: '2\n',
      })

      expect(stopSecond.code).toBe(0)
      expect(stopSecond.output).toContain('Multiple TTDash background servers are running:')
      expect(stopSecond.output).toContain(firstUrl)
      expect(stopSecond.output).toContain(secondUrl)
      expect(stopSecond.output).toContain(`Stopped TTDash background server: ${secondUrl}`)

      const firstUsageResponse = await fetch(`${firstUrl}/api/usage`)
      expect(firstUsageResponse.status).toBe(200)
      await waitForServerUnavailable(secondUrl)

      const stopFirst = await runCli(['stop'], {
        env: backgroundEnv,
      })

      expect(stopFirst.code).toBe(0)
      expect(stopFirst.output).toContain(`Stopped TTDash background server: ${firstUrl}`)
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
        runCli(['--background', '--no-open', '--port', String(firstPort)], {
          env: backgroundEnv,
        }),
        runCli(['--background', '--no-open', '--port', String(secondPort)], {
          env: backgroundEnv,
        }),
      ])

      expect(firstStart.code).toBe(0)
      expect(secondStart.code).toBe(0)
      expect(firstStart.output).toContain('TTDash is running in the background.')
      expect(secondStart.output).toContain('TTDash is running in the background.')

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
      expect(registry.map((instance) => instance.url).sort()).toEqual([firstUrl, secondUrl].sort())
    } finally {
      await stopAllBackgroundServers(backgroundEnv, backgroundRoot)
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  }, 60_000)

  it('prunes stale background entries that point to a live non-matching process', async () => {
    const backgroundRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-background-stale-test-'))
    const backgroundEnv = createCliEnv(backgroundRoot)

    try {
      const runtimeResponse = await fetch(`${baseUrl}/api/runtime`)
      expect(runtimeResponse.status).toBe(200)
      const runtime = await runtimeResponse.json()

      writeBackgroundRegistry(backgroundRoot, [
        {
          id: 'stale-entry',
          pid: child?.pid,
          port: runtime.port,
          url: baseUrl,
          host: '127.0.0.1',
          startedAt: new Date().toISOString(),
          logFile: null,
        },
      ])

      const stopResult = await runCli(['stop'], {
        env: backgroundEnv,
      })

      expect(stopResult.code).toBe(0)
      expect(stopResult.output).toContain('No running TTDash background servers found.')

      const usageResponse = await fetch(`${baseUrl}/api/usage`)
      expect(usageResponse.status).toBe(200)
      expect(readBackgroundRegistry(backgroundRoot)).toEqual([])
    } finally {
      rmSync(backgroundRoot, { recursive: true, force: true })
    }
  })

  it('keeps explicit runtime dir overrides independent', async () => {
    const runtimeRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-runtime-dir-test-'))
    const explicitConfigDir = path.join(runtimeRoot, 'explicit-config')

    const expectedPlatformPaths =
      process.platform === 'darwin'
        ? {
            dataFile: path.join(
              runtimeRoot,
              'Library',
              'Application Support',
              'TTDash',
              'data.json',
            ),
            settingsFile: path.join(explicitConfigDir, 'settings.json'),
            cacheDir: path.join(runtimeRoot, 'Library', 'Caches', 'TTDash'),
          }
        : process.platform === 'win32'
          ? {
              dataFile: path.join(runtimeRoot, 'AppData', 'Local', 'TTDash', 'data.json'),
              settingsFile: path.join(explicitConfigDir, 'settings.json'),
              cacheDir: path.join(runtimeRoot, 'AppData', 'Local', 'TTDash', 'Cache'),
            }
          : {
              dataFile: path.join(runtimeRoot, 'data', 'ttdash', 'data.json'),
              settingsFile: path.join(explicitConfigDir, 'settings.json'),
              cacheDir: path.join(runtimeRoot, 'cache', 'ttdash'),
            }

    let standaloneServer: Awaited<ReturnType<typeof startStandaloneServer>> | null = null

    try {
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
        envOverrides: {
          TTDASH_CONFIG_DIR: explicitConfigDir,
        },
      })

      const uploadResponse = await fetch(`${standaloneServer.url}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleUsage),
      })
      expect(uploadResponse.status).toBe(200)

      const settingsResponse = await fetch(`${standaloneServer.url}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'en' }),
      })
      expect(settingsResponse.status).toBe(200)

      expect(standaloneServer.getOutput()).toContain(
        `Data File:      ${expectedPlatformPaths.dataFile}`,
      )
      expect(standaloneServer.getOutput()).toContain(
        `Settings File:  ${expectedPlatformPaths.settingsFile}`,
      )
      expect(existsSync(expectedPlatformPaths.dataFile)).toBe(true)
      expect(existsSync(expectedPlatformPaths.settingsFile)).toBe(true)
      expect(existsSync(path.join(expectedPlatformPaths.cacheDir, 'npx-cache'))).toBe(true)
      expect(existsSync(path.join(explicitConfigDir, 'data.json'))).toBe(false)
    } finally {
      if (standaloneServer) {
        await stopProcess(standaloneServer.child)
      }
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  }, 20_000)

  it('fails cleanly when port 65535 is busy instead of retrying to 65536', async () => {
    const occupiedPortServer = createServer()
    const cliRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-port-limit-test-'))

    try {
      await new Promise<void>((resolve, reject) => {
        occupiedPortServer.once('error', reject)
        occupiedPortServer.listen(65535, '127.0.0.1', () => resolve())
      })

      const result = await runCli(['--port', '65535'], {
        env: createCliEnv(cliRoot),
      })

      expect(result.code).toBe(1)
      expect(result.output).toContain('No free port found (65535-65535)')
      expect(result.output).not.toContain('trying 65536')
    } finally {
      await new Promise((resolve) => occupiedPortServer.close(() => resolve(undefined)))
      rmSync(cliRoot, { recursive: true, force: true })
    }
  }, 20_000)

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
      expect(await corruptResponse.json()).toEqual({
        message: 'Usage data file is unreadable or corrupted.',
      })

      const deleteResponse = await fetch(`${standaloneServer.url}/api/usage`, {
        method: 'DELETE',
      })
      expect(deleteResponse.status).toBe(200)

      const recoveredResponse = await fetch(`${standaloneServer.url}/api/usage`)
      expect(recoveredResponse.status).toBe(200)
      expect(await recoveredResponse.json()).toMatchObject({
        daily: [],
        totals: {
          totalCost: 0,
          totalTokens: 0,
        },
      })
    } finally {
      if (standaloneServer) {
        await stopProcess(standaloneServer.child)
      }
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
      standaloneServer = await startStandaloneServer({
        root: runtimeRoot,
      })

      const corruptResponse = await fetch(`${standaloneServer.url}/api/settings`)
      expect(corruptResponse.status).toBe(500)
      expect(await corruptResponse.json()).toEqual({
        message: 'Settings file is unreadable or corrupted.',
      })

      const deleteResponse = await fetch(`${standaloneServer.url}/api/settings`, {
        method: 'DELETE',
      })
      expect(deleteResponse.status).toBe(200)

      const recoveredResponse = await fetch(`${standaloneServer.url}/api/settings`)
      expect(recoveredResponse.status).toBe(200)
      expect(await recoveredResponse.json()).toMatchObject({
        language: 'de',
        theme: 'dark',
        providerLimits: {},
        defaultFilters: DEFAULT_DASHBOARD_FILTERS,
      })
    } finally {
      if (standaloneServer) {
        await stopProcess(standaloneServer.child)
      }
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  })

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
      expect(result.output).toContain(
        'Refusing to bind TTDash to non-loopback host "0.0.0.0" without TTDASH_ALLOW_REMOTE=1.',
      )
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
      expect(standaloneServer.getOutput()).toContain(
        'Security warning: this bind host can expose local data and destructive API routes.',
      )
    } finally {
      if (standaloneServer) {
        await stopProcess(standaloneServer.child)
      }
      rmSync(runtimeRoot, { recursive: true, force: true })
    }
  }, 20_000)
})
