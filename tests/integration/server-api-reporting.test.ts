import { describe, expect, it } from 'vitest'
import { fetchTrusted, hasTypst } from './server-test-helpers'
import { createApiSharedServer, sampleUsage } from './server-api-test-helpers'

const sharedServer = createApiSharedServer()
const itIfTypst = hasTypst ? it : it.skip

describe('local server API reporting', () => {
  it('rejects report generation when no usage data exists', async () => {
    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewMode: 'daily' }),
    })
    expect(response.status).toBe(400)
  })

  itIfTypst('generates a PDF report for valid requests', async () => {
    await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })

    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/report/pdf`, {
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
  })

  it('rejects malformed report payloads before report generation starts', async () => {
    await fetchTrusted(`${sharedServer.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsage),
    })

    const response = await fetchTrusted(`${sharedServer.baseUrl}/api/report/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"viewMode":"daily"',
    })
    expect(response.status).toBe(400)
  })
})
