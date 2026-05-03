import { describe, expect, it, vi } from 'vitest'
import { createRouter, createValidUsageData, request, requestRaw } from './http-router-test-helpers'

describe('PDF report routes', () => {
  it('rejects PDF reports without usage data before reading the request body', async () => {
    const readBody = vi.fn(async () => ({ title: 'Usage' }))
    const { router } = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => null),
      },
      readBody,
    })

    const { res, body } = await request(router, '/api/report/pdf', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'No data available for the report.' })
    expect(readBody).not.toHaveBeenCalled()
  })

  it('maps invalid PDF request bodies to 400', async () => {
    const usageData = createValidUsageData()
    const { router } = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => usageData),
      },
      readBody: vi.fn(async () => {
        throw new Error('broken report JSON')
      }),
    })

    const { res, body } = await request(router, '/api/report/pdf', 'POST')

    expect(res.status).toBe(400)
    expect(body).toEqual({ message: 'Invalid report request' })
  })

  it('maps oversized PDF request bodies to 413', async () => {
    const usageData = createValidUsageData()
    const { router } = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => usageData),
      },
      readBody: vi.fn(async () => {
        throw Object.assign(new Error('too large'), { code: 'PAYLOAD_TOO_LARGE' })
      }),
    })

    const { res, body } = await request(router, '/api/report/pdf', 'POST')

    expect(res.status).toBe(413)
    expect(body).toEqual({ message: 'Report request too large' })
  })

  it('maps missing Typst PDF generator failures to 503', async () => {
    const usageData = createValidUsageData()
    const { router } = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => usageData),
      },
      generatePdfReport: vi.fn(async () => {
        throw Object.assign(new Error('Typst not found'), { code: 'TYPST_MISSING' })
      }),
      readBody: vi.fn(async () => ({ locale: 'de-CH' })),
    })

    const { res, body } = await request(router, '/api/report/pdf', 'POST')

    expect(res.status).toBe(503)
    expect(body).toEqual({ message: 'Typst not found' })
  })

  it('sends generated PDF buffers with attachment headers', async () => {
    const usageData = createValidUsageData()
    const generatePdfReport = vi.fn(async () => ({
      buffer: Buffer.from('%PDF-1.4'),
      filename: 'ttdash-report.pdf',
    }))
    const { router } = createRouter({
      dataRuntimeOverrides: {
        readData: vi.fn(() => usageData),
      },
      generatePdfReport,
      readBody: vi.fn(async () => ({ locale: 'de-CH' })),
    })

    const { res } = await requestRaw(router, '/api/report/pdf', 'POST')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="ttdash-report.pdf"; filename*=UTF-8\'\'ttdash-report.pdf',
    )
    expect(res.body).toBe('%PDF-1.4')
    expect(generatePdfReport).toHaveBeenCalledWith(usageData.daily, { locale: 'de-CH' })
  })
})
