import { describe, expect, it } from 'vitest'
import { dashboardFixture } from '../fixtures/usage-data'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createModelColorPalette } = require('../../shared/model-colors.js') as {
  createModelColorPalette: (modelNames?: string[]) => {
    getColorRgb: (name: string, options?: { theme?: 'light' | 'dark' }) => string
  }
}

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
      'GPT-5.4, Claude Sonnet 4.5, Gemini 2.5 Pro +1 more',
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

  it('normalizes current toktrack model families in report filter summaries', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const report = buildReportData(dashboardFixture, {
      viewMode: 'daily',
      language: 'en',
      selectedModels: ['gpt-5.3-codex', 'gemini-2.5-flash', 'codex-mini-latest', 'o4-mini'],
    })

    expect(report.meta.filterSummary.selectedModelsLabel).toBe(
      'GPT-5.3 Codex, Gemini 2.5 Flash, Codex Mini +1 more',
    )
  })

  it('keeps Claude family names and dotted versions intact in filter summaries', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const report = buildReportData(dashboardFixture, {
      viewMode: 'daily',
      language: 'en',
      selectedModels: ['claude-sonnet-4-5'],
    })

    expect(report.meta.filterSummary.selectedModelsLabel).toBe('Claude Sonnet 4.5')
  })

  it('builds localized chart descriptions and exposes full labels for truncated model names', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const longModelName =
      'This is a very long model name that should stay understandable in the PDF'
    const dataWithLongModel = dashboardFixture.map((day, index) => ({
      ...day,
      modelBreakdowns: day.modelBreakdowns.map((entry, entryIndex) =>
        index === 0 && entryIndex === 0
          ? {
              ...entry,
              modelName: longModelName,
              cost: entry.cost + 50,
            }
          : entry,
      ),
    }))

    const report = buildReportData(dataWithLongModel, {
      viewMode: 'daily',
      language: 'en',
    })
    const normalizedLongModelName = report.topModels[0].name

    expect(report.chartDescriptions.costTrend.alt).toBe('Line chart showing report cost by period.')
    expect(report.chartDescriptions.costTrend.summary).toContain('Peak')
    expect(report.chartDescriptions.topModels.summary).toContain(normalizedLongModelName)
    expect(report.chartDescriptions.topModels.fullNamesNote).toContain(normalizedLongModelName)
    expect(report.chartDescriptions.tokenTrend.summary).toContain('Peak token volume')
  })

  it('omits the full-names note when top-model labels fit without truncation', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')

    const report = buildReportData(dashboardFixture, {
      viewMode: 'daily',
      language: 'en',
    })

    expect(report.chartDescriptions.topModels.fullNamesNote).toBeNull()
  })

  it('keeps report model colors stable against filters by using the full loaded dataset palette', async () => {
    const { buildReportData } = await import('../../server/report/utils.js')
    const palette = createModelColorPalette(['Claude Opus 4.5', 'Claude Opus 4.6'])
    const data = [
      {
        ...dashboardFixture[0],
        date: '2026-04-01',
        modelsUsed: ['claude-opus-4-5'],
        modelBreakdowns: [
          {
            ...dashboardFixture[0].modelBreakdowns[0],
            modelName: 'claude-opus-4-5',
            cost: 4,
          },
        ],
      },
      {
        ...dashboardFixture[1],
        date: '2026-04-02',
        modelsUsed: ['claude-opus-4-6'],
        modelBreakdowns: [
          {
            ...dashboardFixture[1].modelBreakdowns[0],
            modelName: 'claude-opus-4-6',
            cost: 6,
          },
        ],
      },
    ]

    const report = buildReportData(data, {
      viewMode: 'daily',
      language: 'en',
      selectedModels: ['Claude Opus 4.5'],
    })

    expect(report.topModels[0].name).toBe('Claude Opus 4.5')
    expect(report.topModels[0].color).toBe(
      palette.getColorRgb('Claude Opus 4.5', { theme: 'light' }),
    )
  })
})
