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

    expect(report.meta.filterSummary.selectedProvidersLabel).toBe('OpenAI, Anthropic, Google +1 more')
    expect(report.meta.filterSummary.selectedModelsLabel).toBe('GPT-5.4, Sonnet 4.5, Gemini +1 more')
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
    expect(report.insights.items.some((item: { title: string }) => item.title === 'Data coverage')).toBe(true)
    expect(report.insights.items.some((item: { title: string }) => item.title === 'Provider concentration')).toBe(true)
  })

  it('formats compact chart axes for the current language', async () => {
    const { formatCompactAxis } = await import('../../server/report/utils.js')

    expect(formatCompactAxis(1500, 'en')).toBe('1.5k')
    expect(formatCompactAxis(1500, 'de')).toBe('1.5 Tsd.')
    expect(formatCompactAxis(2500000, 'de')).toBe('2.5 Mio.')
  })
})
