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

  it('summarizes long filter selections and localizes peak period labels', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const report = buildReportData(dashboardFixture, {
      viewMode: 'daily',
      language: 'en',
      selectedProviders: ['OpenAI', 'Anthropic', 'Google', 'Meta'],
      selectedModels: ['gpt-5.4', 'claude-sonnet-4-5', 'gemini-2.5-pro', 'opencode'],
    })

    expect(report.meta.filterSummary.selectedProvidersLabel).toBe(
      'OpenAI, Anthropic, Google +1 more',
    )
    expect(report.meta.filterSummary.selectedModelsLabel).toBe(
      'GPT-5.4, Sonnet 4.5, Gemini +1 more',
    )
    expect(report.summaryCards[5].label).toBe('Peak period')
    expect(report.summaryCards[5].value).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('uses top model wording in interpretation text instead of model family wording', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const report = buildReportData(dashboardFixture, {
      viewMode: 'daily',
      language: 'en',
    })

    expect(report.interpretation.summary).toContain('Top model:')
    expect(report.interpretation.summary).not.toContain('model family')
    expect(report.labels.topDay).toContain('$')
  })

  it('derives insight callouts for sparse data and provider concentration', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const report = buildReportData(dashboardFixture.slice(0, 2), {
      viewMode: 'daily',
      language: 'en',
      selectedProviders: ['OpenAI'],
    })

    expect(report.insights.items.length).toBeGreaterThan(0)
    expect(
      report.insights.items.some((item: { title: string }) => item.title === 'Data coverage'),
    ).toBe(true)
    expect(
      report.insights.items.some(
        (item: { title: string }) => item.title === 'Provider concentration',
      ),
    ).toBe(true)
  })

  it('formats compact chart axes for the current language', async () => {
    const { formatCompact, formatCompactAxis } = await import('../../server/report/utils.js')

    expect(formatCompact(1500, 'en')).toBe('1.5k')
    expect(formatCompact(1500, 'de')).toBe('1.5 Tsd.')
    expect(formatCompactAxis(1500, 'en')).toBe('1.5k')
    expect(formatCompactAxis(1500, 'de')).toBe('1.5 Tsd.')
    expect(formatCompact(2500000, 'de')).toBe('2.5 Mio.')
    expect(formatCompactAxis(2500000, 'de')).toBe('2.5 Mio.')
  })

  it('keeps cache insights visible without request counters when token cache data exists', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')
    const dataWithoutRequests = dashboardFixture.map((day) => ({
      ...day,
      requestCount: 0,
      modelBreakdowns: day.modelBreakdowns.map((entry) => ({
        ...entry,
        requestCount: 0,
      })),
    }))

    const report = buildReportData(dataWithoutRequests, {
      viewMode: 'daily',
      language: 'en',
    })

    expect(report.metrics.hasRequestData).toBe(false)
    expect(report.metrics.cacheHitRate).toBeGreaterThan(0)
    expect(
      report.insights.items.some((item: { title: string }) => item.title === 'Cache contribution'),
    ).toBe(true)
  })

  it('keeps percent strings in german report output and localizes the report header', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const report = buildReportData(dashboardFixture, {
      viewMode: 'daily',
      language: 'de',
    })

    expect(report.summaryCards[0].note).toContain('%')
    expect(report.insights.items.some((item: { body: string }) => item.body.includes('%'))).toBe(
      true,
    )
    expect(report.text.headerEyebrow).toBe('TTDash PDF-Bericht')
  })

  it('uses locale-aware percent formatting for top model and provider labels', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const report = buildReportData(dashboardFixture, {
      viewMode: 'daily',
      language: 'de',
    })

    expect(report.labels.topModel).toContain(report.summaryCards[4].note)
    expect(report.labels.topProvider).toContain(
      report.summaryCards[0].note.replace(`${report.metrics.topProvider?.name} `, ''),
    )
  })

  it('uses period averages for aggregated summary cards', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const monthlyReport = buildReportData(dashboardFixture, {
      viewMode: 'monthly',
      language: 'en',
    })
    const yearlyReport = buildReportData(dashboardFixture, {
      viewMode: 'yearly',
      language: 'en',
    })

    expect(monthlyReport.summaryCards[3].label).toBe('Ø Cost / month')
    expect(monthlyReport.meta.periods).toBe(2)
    expect(monthlyReport.summaryCards[3].value).toBe('$15.00')
    expect(yearlyReport.summaryCards[3].label).toBe('Ø Cost / year')
    expect(yearlyReport.summaryCards[3].value).toBe('$30.00')
    expect(monthlyReport.summaryCards[3].value).not.toBe('$7.50')
  })
})
