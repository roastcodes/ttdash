import { once } from 'node:events'
import * as http from 'node:http'
import { createRequire } from 'node:module'
import { createConnection, type AddressInfo, type Socket } from 'node:net'
import { expect, it, vi } from 'vitest'
import { sendRawHttpRequest } from './server-test-helpers'

const require = createRequire(import.meta.url)
const { createServerLifecycle } = require('../../server/server-lifecycle.js') as {
  createServerLifecycle: (options: Record<string, unknown>) => { server: http.Server }
}

it('releases a real reset TCP connection quietly and keeps serving requests', async () => {
  const errorLog = vi.fn()
  const { server } = createServerLifecycle({
    http,
    errorLog,
    router: {
      handleServerRequest: async (_req: http.IncomingMessage, res: http.ServerResponse) => {
        res.end('healthy')
      },
    },
  })
  let client: Socket | undefined

  try {
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const port = (server.address() as AddressInfo).port
    const connection = once(server, 'connection')
    client = createConnection({ host: '127.0.0.1', port })
    const connected = once(client, 'connect')
    const [serverSocket] = (await connection) as [Socket]
    await connected

    // Wait until the server has received partial headers before resetting the
    // connection, so this exercises an actual in-flight HTTP parser failure.
    const received = once(serverSocket, 'data')
    client.write('GET / HTTP/1.1\r\nHost: 127.0.0.1\r\n')
    await received
    const clientError = new Promise<NodeJS.ErrnoException>((resolve) => {
      server.once('clientError', resolve)
    })
    const closed = new Promise<void>((resolve) => {
      serverSocket.once('close', () => resolve())
    })
    client.resetAndDestroy()

    expect((await clientError).code).toBe('ECONNRESET')
    await closed
    expect(serverSocket.destroyed).toBe(true)
    expect(errorLog).not.toHaveBeenCalled()

    const response = await sendRawHttpRequest(
      port,
      'GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n',
    )
    expect(response).toContain('HTTP/1.1 200 OK')
    expect(response).toContain('healthy')
  } finally {
    client?.destroy()
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
