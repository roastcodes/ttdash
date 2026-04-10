import { describe, expect, it } from 'vitest'
import { dashboardFixture } from '../fixtures/usage-data'

describe('report utils', () => {
  it('keeps aggregated trend metrics disabled for monthly report data', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const report = buildReportData(dashboardFixture, {
      viewMode: 'monthly',
      language: 'en',
    })

    expect(report.meta.filterSummary.viewMode).toBe('Monthly view')
    expect(report.metrics.weekOverWeekChange).toBeNull()
  })
})
