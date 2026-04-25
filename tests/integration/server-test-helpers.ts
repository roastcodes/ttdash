import { createConnection, createServer } from 'node:net'
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import {
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
import { afterAll, beforeAll } from 'vitest'

export type BackgroundRegistryEntry = {
  url: string
  bootstrapUrl?: string | null
  port: number
  pid: number
  apiPrefix?: string
  authHeader?: string | null
  logFile?: string | null
}

export type SharedServerContext = {
  child: ChildProcessWithoutNullStreams | null
  baseUrl: string
  authHeader: string | null
  authHeaders: Record<string, string>
  bootstrapUrl: string | null
  tempRoot: string
  output: string
}

export type LocalAuthSession = {
  version: number
  mode: string
  instanceId: string
  pid: number
  url: string
  apiPrefix: string
  authorizationHeader: string
  bootstrapUrl: string
  createdAt: string
}

const authHeadersByOrigin = new Map<string, string>()

export const hasTypst = (() => {
  const result = spawnSync('typst', ['--version'], { stdio: 'ignore' })
  return !result.error && result.status === 0
})()

export const isPosix = process.platform !== 'win32'

export function permissionBits(targetPath: string) {
  return statSync(targetPath).mode & 0o777
}

export async function getFreePort() {
  return await new Promise<number>((resolve, reject) => {
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

async function waitForServerReady(
  url: string,
  {
    child,
    getOutput,
    readinessPath = '/api/usage',
    readinessHeaders,
    timeoutMs = 15_000,
  }: {
    child?: ChildProcessWithoutNullStreams | null
    getOutput?: () => string
    readinessPath?: string
    readinessHeaders?: Record<string, string>
    timeoutMs?: number
  } = {},
) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (child && child.exitCode !== null) {
      throw new Error(`Server exited before becoming ready:\n${getOutput?.() ?? url}`)
    }

    try {
      const response = await fetch(`${url}${readinessPath}`, {
        headers: readinessHeaders,
      })
      if (response.ok) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  if (getOutput) {
    throw new Error(`Timed out waiting for server startup:\n${getOutput()}`)
  }

  throw new Error(`Timed out waiting for server startup: ${url}`)
}

export async function waitForServer(
  url: string,
  getOutput: () => string,
  child?: ChildProcessWithoutNullStreams | null,
) {
  await waitForServerReady(url, { getOutput, child })
}

export async function waitForUrlAvailable(url: string) {
  await waitForServerReady(url, { readinessHeaders: getRegisteredAuthHeaders(url) })
}

export async function waitForServerUnavailable(url: string) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 15_000) {
    try {
      await fetchWithAuth(`${url}/api/usage`)
    } catch {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for server shutdown: ${url}`)
}

export async function waitForProcessServer(
  currentChild: ChildProcessWithoutNullStreams,
  url: string,
  getOutput: () => string,
  readinessPath = '/api/usage',
  readinessHeaders?: Record<string, string>,
) {
  await waitForServerReady(url, {
    child: currentChild,
    getOutput,
    readinessPath,
    readinessHeaders,
  })
}

export async function stopProcess(currentChild: ChildProcessWithoutNullStreams) {
  if (currentChild.exitCode !== null) {
    return
  }

  currentChild.kill('SIGTERM')
  await new Promise((resolve) => currentChild.once('close', resolve))
}

export function createCliEnv(root: string) {
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

export async function startStandaloneServer({
  root,
  args = [],
  envOverrides = {},
  readinessPath = '/api/usage',
  readinessHeaders,
}: {
  root: string
  args?: string[]
  envOverrides?: NodeJS.ProcessEnv
  readinessPath?: string
  readinessHeaders?: Record<string, string>
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

  const localAuthSession = readinessHeaders
    ? null
    : await waitForLocalAuthSession(root, currentChild, () => serverOutput)
  const effectiveReadinessHeaders =
    readinessHeaders ?? authHeadersFromSession(localAuthSession) ?? undefined

  if (effectiveReadinessHeaders?.Authorization) {
    registerAuthHeader(url, effectiveReadinessHeaders.Authorization)
  }

  await waitForProcessServer(
    currentChild,
    url,
    () => serverOutput,
    readinessPath,
    effectiveReadinessHeaders,
  )

  return {
    child: currentChild,
    url,
    port,
    authHeader: effectiveReadinessHeaders?.Authorization ?? null,
    authHeaders: effectiveReadinessHeaders ?? {},
    bootstrapUrl: localAuthSession?.bootstrapUrl ?? null,
    getOutput: () => serverOutput,
  }
}

export function getCliConfigDir(root: string) {
  if (process.platform === 'darwin') {
    return path.join(root, 'Library', 'Application Support', 'TTDash')
  }

  if (process.platform === 'win32') {
    return path.join(root, 'AppData', 'Roaming', 'TTDash')
  }

  return path.join(root, 'config', 'ttdash')
}

export function getCliDataDir(root: string) {
  if (process.platform === 'darwin') {
    return path.join(root, 'Library', 'Application Support', 'TTDash')
  }

  if (process.platform === 'win32') {
    return path.join(root, 'AppData', 'Local', 'TTDash')
  }

  return path.join(root, 'data', 'ttdash')
}

export function getLocalAuthSessionPath(root: string) {
  return path.join(getCliConfigDir(root), 'session-auth.json')
}

export function tryReadLocalAuthSession(root: string) {
  const sessionPath = getLocalAuthSessionPath(root)
  if (!existsSync(sessionPath)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(sessionPath, 'utf-8')) as LocalAuthSession
  } catch {
    return null
  }
}

function tryReadLocalAuthSessionFromOutput(output: string) {
  const match = output.match(/Local Auth URL:\s+(http:\/\/[^\s]+)/)
  if (!match?.[1]) {
    return null
  }

  try {
    const bootstrapUrl = match[1]
    const parsedUrl = new URL(bootstrapUrl)
    const token = parsedUrl.searchParams.get('ttdash_token')
    if (!token) {
      return null
    }

    return {
      version: 1,
      mode: 'local',
      instanceId: '',
      pid: 0,
      url: parsedUrl.origin,
      apiPrefix: '/api',
      authorizationHeader: `Bearer ${token}`,
      bootstrapUrl,
      createdAt: '',
    } satisfies LocalAuthSession
  } catch {
    return null
  }
}

export async function waitForLocalAuthSession(
  root: string,
  child?: ChildProcessWithoutNullStreams | null,
  getOutput?: () => string,
  timeoutMs = 15_000,
) {
  const startedAt = Date.now()
  let lastSession = tryReadLocalAuthSession(root)

  while (Date.now() - startedAt < timeoutMs) {
    if (child && child.exitCode !== null) {
      throw new Error(`Server exited before writing local auth session:\n${getOutput?.() ?? ''}`)
    }

    lastSession =
      tryReadLocalAuthSession(root) ?? tryReadLocalAuthSessionFromOutput(getOutput?.() ?? '')
    if (lastSession?.authorizationHeader) {
      return lastSession
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(
    `Timed out waiting for local auth session: ${JSON.stringify(lastSession, null, 2)}\n${
      getOutput?.() ?? ''
    }`,
  )
}

function authHeadersFromSession(session: LocalAuthSession | null) {
  return session?.authorizationHeader ? { Authorization: session.authorizationHeader } : null
}

export function registerAuthHeader(url: string, authorizationHeader: string | null | undefined) {
  if (!authorizationHeader) {
    return
  }

  authHeadersByOrigin.set(new URL(url).origin, authorizationHeader)
}

export function getRegisteredAuthHeaders(url: string) {
  const authorizationHeader = authHeadersByOrigin.get(new URL(url).origin)
  return authorizationHeader ? { Authorization: authorizationHeader } : undefined
}

function applyRegisteredAuthHeader(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const registeredAuthHeader = authHeadersByOrigin.get(new URL(url).origin)

  if (registeredAuthHeader && !headers.has('Authorization')) {
    headers.set('Authorization', registeredAuthHeader)
  }

  return headers
}

export async function sendRawHttpRequest(port: number, request: string) {
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

export async function fetchTrusted(url: string, init: RequestInit = {}) {
  const method = (init.method || 'GET').toUpperCase()
  const headers = applyRegisteredAuthHeader(url, init)

  if (method === 'GET' || method === 'HEAD') {
    return await fetch(url, {
      ...init,
      headers,
    })
  }

  headers.set('Origin', new URL(url).origin)

  return await fetch(url, {
    ...init,
    headers,
  })
}

export async function fetchWithAuth(url: string, init: RequestInit = {}) {
  return await fetch(url, {
    ...init,
    headers: applyRegisteredAuthHeader(url, init),
  })
}

export function readBackgroundRegistry(root: string) {
  const registryPath = path.join(getCliConfigDir(root), 'background-instances.json')
  return JSON.parse(readFileSync(registryPath, 'utf-8')) as BackgroundRegistryEntry[]
}

export function tryReadBackgroundRegistry(root: string) {
  const registryPath = path.join(getCliConfigDir(root), 'background-instances.json')
  if (!existsSync(registryPath)) {
    return [] as BackgroundRegistryEntry[]
  }

  try {
    return JSON.parse(readFileSync(registryPath, 'utf-8')) as BackgroundRegistryEntry[]
  } catch {
    return []
  }
}

export function writeBackgroundRegistry(root: string, entries: unknown) {
  const registryPath = path.join(getCliConfigDir(root), 'background-instances.json')
  mkdirSync(path.dirname(registryPath), { recursive: true })
  writeFileSync(registryPath, JSON.stringify(entries, null, 2))
}

export async function waitForBackgroundRegistry(
  root: string,
  predicate: (entries: BackgroundRegistryEntry[]) => boolean,
  timeoutMs = 15_000,
) {
  const startedAt = Date.now()
  let lastEntries = tryReadBackgroundRegistry(root)

  while (Date.now() - startedAt < timeoutMs) {
    lastEntries = tryReadBackgroundRegistry(root)
    if (predicate(lastEntries)) {
      lastEntries.forEach((entry) => registerAuthHeader(entry.url, entry.authHeader))
      return lastEntries
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(
    `Timed out waiting for background registry state: ${JSON.stringify(lastEntries, null, 2)}`,
  )
}

export async function waitForHttpOk(url: string, timeoutMs = 15_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchWithAuth(url)
      if (response.ok) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  throw new Error(`Timed out waiting for server startup: ${url}`)
}

export async function runCli(
  args: string[],
  { env, input }: { env: NodeJS.ProcessEnv; input?: string },
) {
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

export async function stopAllBackgroundServers(env: NodeJS.ProcessEnv, root?: string) {
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
        return
      }
      continue
    } else if (result.output.includes('No running TTDash background servers found.')) {
      return
    }
  }
}

export function createSharedServerContext(): SharedServerContext {
  return {
    child: null,
    baseUrl: '',
    authHeader: null,
    authHeaders: {},
    bootstrapUrl: null,
    tempRoot: '',
    output: '',
  }
}

export function registerSharedServerLifecycle(context: SharedServerContext) {
  beforeAll(async () => {
    const port = await getFreePort()
    context.baseUrl = `http://127.0.0.1:${port}`
    context.tempRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-server-test-'))

    context.child = spawn(process.execPath, ['server.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOME: context.tempRoot,
        HOST: '127.0.0.1',
        NO_OPEN_BROWSER: '1',
        PORT: String(port),
        XDG_CACHE_HOME: path.join(context.tempRoot, 'cache'),
        XDG_CONFIG_HOME: path.join(context.tempRoot, 'config'),
        XDG_DATA_HOME: path.join(context.tempRoot, 'data'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    context.child.stdout.on('data', (chunk) => {
      context.output += chunk.toString()
    })

    context.child.stderr.on('data', (chunk) => {
      context.output += chunk.toString()
    })

    const localAuthSession = await waitForLocalAuthSession(
      context.tempRoot,
      context.child,
      () => context.output,
    )
    context.authHeader = localAuthSession.authorizationHeader
    context.authHeaders = { Authorization: localAuthSession.authorizationHeader }
    context.bootstrapUrl = localAuthSession.bootstrapUrl
    registerAuthHeader(context.baseUrl, localAuthSession.authorizationHeader)

    await waitForProcessServer(
      context.child,
      context.baseUrl,
      () => context.output,
      '/api/usage',
      context.authHeaders,
    )
  }, 20_000)

  afterAll(() => {
    if (context.child && context.child.exitCode === null) {
      context.child.kill('SIGTERM')
    }

    if (context.tempRoot) {
      rmSync(context.tempRoot, { recursive: true, force: true })
    }
  })
}
