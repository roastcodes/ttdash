import { describe, expect, it } from 'vitest'
import { fetchTrusted, sendRawHttpRequest } from './server-test-helpers'
import { createApiSharedServer, sampleUsage } from './server-api-test-helpers'

const sharedServer = createApiSharedServer()

describe('local server API guards', () => {
  it('rejects untrusted mutation requests, enforces JSON bodies, and blocks auto-import GET requests', async () => {
    const wrongContentTypeResponse = await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(sampleUsage),
    })
    expect(wrongContentTypeResponse.status).toBe(415)

    const crossSiteUploadResponse = await fetch(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify(sampleUsage),
    })
    expect(crossSiteUploadResponse.status).toBe(403)

    const crossSiteDeleteResponse = await fetch(`${sharedServer.baseUrl}/api/usage`, {
      method: 'DELETE',
      headers: { Origin: 'https://evil.example' },
    })
    expect(crossSiteDeleteResponse.status).toBe(403)

    const missingOriginDeleteResponse = await fetch(`${sharedServer.baseUrl}/api/usage`, {
      method: 'DELETE',
    })
    expect(missingOriginDeleteResponse.status).toBe(403)

    const autoImportGetResponse = await fetch(`${sharedServer.baseUrl}/api/auto-import/stream`)
    expect(autoImportGetResponse.status).toBe(405)
  })

  it('rejects untrusted host headers before route handling', async () => {
    const port = Number(new URL(sharedServer.baseUrl).port)
    const rawResponse = await sendRawHttpRequest(
      port,
      [
        'DELETE /api/usage HTTP/1.1',
        'Host: evil.example',
        'Origin: http://evil.example',
        'Connection: close',
        '',
        '',
      ].join('\r\n'),
    )

    expect(rawResponse.startsWith('HTTP/1.1 403 Forbidden')).toBe(true)
    expect(rawResponse).toContain('{"message":"Untrusted host header"}')
  })

  it('returns 400 for malformed request paths without crashing the server', async () => {
    const port = Number(new URL(sharedServer.baseUrl).port)
    const rawResponse = await sendRawHttpRequest(
      port,
      'GET /%E0%A4%A HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n',
    )

    expect(rawResponse.startsWith('HTTP/1.1 400 Bad Request')).toBe(true)
  })

  it('rejects null-byte static paths without crashing the server', async () => {
    const port = Number(new URL(sharedServer.baseUrl).port)
    const rawResponse = await sendRawHttpRequest(
      port,
      'GET /%00/etc/passwd HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n',
    )

    expect(rawResponse.startsWith('HTTP/1.1 400 Bad Request')).toBe(true)
  })

  it('returns 413 for oversized upload payloads instead of resetting the connection', async () => {
    const oversizedPayload = `"${'a'.repeat(11 * 1024 * 1024)}"`
    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedPayload,
    })
    expect(response.status).toBe(413)
  })

  it('returns 413 for oversized report payloads instead of resetting the connection', async () => {
    await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })
    const oversizedPayload = `"${'a'.repeat(11 * 1024 * 1024)}"`
    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedPayload,
    })
    expect(response.status).toBe(413)
  })
})
