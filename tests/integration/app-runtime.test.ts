import { EventEmitter } from 'node:events'
import { promises as fsPromises } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const { createAppRuntime } = require('../../server/app-runtime.js') as {
  createAppRuntime: (options: Record<string, unknown>) => {
    server: EventEmitter
  }
}

const REQUEST_TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS || 5000)

class MockRequest extends EventEmitter {
  method = 'GET'
  url: string
  headers: Record<string, string>
  socket = { localAddress: '127.0.0.1' }

  constructor(url: string, headers: Record<string, string>) {
    super()
    this.url = url
    this.headers = headers
  }
}

class MockResponse extends EventEmitter {
  status = 0
  headers: Record<string, string | number | string[]> = {}
  body = ''
  headersSent = false

  writeHead(status: number, headers: Record<string, string | number | string[]>) {
    this.status = status
    this.headers = headers
    this.headersSent = true
  }

  end(body?: string | Buffer) {
    this.body = Buffer.isBuffer(body) ? body.toString('utf8') : (body ?? '')
    this.emit('finish')
  }
}

async function emitServerRequest(
  server: EventEmitter,
  url: string,
  headers: Record<string, string>,
) {
  const request = new MockRequest(url, headers)
  const response = new MockResponse()
  const finished = new Promise<MockResponse>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout)
      response.off('error', onError)
      response.off('finish', onFinish)
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }
    const onFinish = () => {
      cleanup()
      resolve(response)
    }
    const timeout = setTimeout(() => {
      response.off('error', onError)
      response.off('finish', onFinish)
      reject(new Error(`Timed out waiting for ${url}`))
    }, REQUEST_TIMEOUT_MS)

    response.once('error', onError)
    response.once('finish', onFinish)
  })

  server.emit('request', request, response)
  return finished
}

describe('app runtime wiring', () => {
  it('composes the real server runtime with isolated paths, API prefix, and auth', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-app-runtime-'))
    const authToken = 'test-local-auth-token-with-enough-entropy'
    const processObject = {
      ...process,
      argv: ['node', 'server.js', '--no-open'],
      env: {
        ...process.env,
        API_PREFIX: '/custom-api',
        CI: '1',
        HOST: '127.0.0.1',
        NO_OPEN_BROWSER: '1',
        PORT: '4217',
        TTDASH_CACHE_DIR: path.join(runtimeRoot, 'cache'),
        TTDASH_CONFIG_DIR: path.join(runtimeRoot, 'config'),
        TTDASH_DATA_DIR: path.join(runtimeRoot, 'data'),
        TTDASH_INSTANCE_ID: 'app-runtime-contract',
        TTDASH_LOCAL_AUTH_TOKEN: authToken,
      },
      exit: vi.fn(),
      kill: vi.fn(() => true),
      on: vi.fn(),
      pid: 42170,
      platform: process.platform,
      stdout: { isTTY: false },
    }

    try {
      const runtime = createAppRuntime({
        entrypointPath: path.join(runtimeRoot, 'server.js'),
        processObject,
      })

      const response = await emitServerRequest(runtime.server, '/custom-api/runtime', {
        authorization: `Bearer ${authToken}`,
        host: '127.0.0.1:4217',
      })

      expect(response.status).toBe(200)
      expect(JSON.parse(response.body)).toEqual({
        id: 'app-runtime-contract',
        mode: 'foreground',
        port: null,
        url: null,
      })
      expect(processObject.exit).not.toHaveBeenCalled()
    } finally {
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })
})
