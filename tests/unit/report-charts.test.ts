import { describe, expect, it } from 'vitest'

describe('report charts', () => {
  it('shares one truncation rule for top-model labels and boundary cases', async () => {
    const { truncateTopModelChartLabel, TOP_MODEL_CHART_LABEL_MAX_LENGTH } =
      await import('../../server/report/chart-labels.js')

    expect(truncateTopModelChartLabel('x'.repeat(TOP_MODEL_CHART_LABEL_MAX_LENGTH))).toBe(
      'x'.repeat(TOP_MODEL_CHART_LABEL_MAX_LENGTH),
    )
    expect(truncateTopModelChartLabel('x'.repeat(TOP_MODEL_CHART_LABEL_MAX_LENGTH + 1))).toBe(
      `${'x'.repeat(TOP_MODEL_CHART_LABEL_MAX_LENGTH - 1)}…`,
    )
  })

  it('keeps sub-dollar cost axis labels precise in PDF chart assets', async () => {
    const { __test__ } = await import('../../server/report/index.js')

    expect(__test__.formatCostAxisValue(0.06, 'en')).toBe('$0.06')
    expect(__test__.formatCostAxisValue(0.24, 'en')).toBe('$0.24')
    expect(__test__.formatCostAxisValue(12.5, 'en')).toBe('$12.5')
    expect(__test__.formatCostAxisValue(120, 'en')).toBe('$120')
    expect(__test__.formatCostAxisValue(1234.5, 'de')).toBe("$1'235")
  })

  it('uses the same locale-aware cost formatter for top-model PDF charts', async () => {
    const { __test__ } = await import('../../server/report/index.js')

    const chartAssets = __test__.createChartAssets({
      meta: {
        language: 'de',
        filterSummary: {
          viewModeKey: 'daily',
        },
      },
      charts: {
        costTrend: [{ date: '2026-04-14', cost: 1234.5, ma7: 1234.5 }],
        tokenTrend: [
          {
            date: '2026-04-14',
            input: 1200,
            output: 300,
            cacheWrite: 0,
            cacheRead: 0,
            thinking: 0,
          },
        ],
      },
      topModels: [
        {
          name: 'GPT-5.4',
          cost: 1234.5,
          color: '#123456',
        },
      ],
      text: {
        charts: {
          costTrend: 'Kostenverlauf',
          topModels: 'Top-Modelle nach Kosten',
          tokenTrend: 'Token-Mix pro Zeitraum',
        },
      },
    })

    expect(chartAssets['top-models.svg']).toContain("$1'235")
  })

  it('uses the provided formatter for stacked chart y-axis labels', async () => {
    const { stackedBarChart } = await import('../../server/report/charts.js')

    const svg = stackedBarChart(
      [
        { label: 'Mar', input: 1200, output: 300, cacheWrite: 0, cacheRead: 0, thinking: 0 },
        { label: 'Apr', input: 2400, output: 600, cacheWrite: 100, cacheRead: 20, thinking: 0 },
      ],
      {
        title: 'Token mix',
        formatter: (value) => `fmt:${Math.round(value)}`,
        segments: [
          { key: 'input', label: 'Input', color: '#000' },
          { key: 'output', label: 'Output', color: '#111' },
          { key: 'cacheWrite', label: 'Cache Write', color: '#222' },
          { key: 'cacheRead', label: 'Cache Read', color: '#333' },
          { key: 'thinking', label: 'Thinking', color: '#444' },
        ],
      },
    )

    expect(svg).toContain('fmt:0')
    expect(svg).toContain('fmt:780')
    expect(svg).not.toContain('de-CH')
  })

  it('truncates overly long horizontal bar labels to keep the chart readable', async () => {
    const { horizontalBarChart } = await import('../../server/report/charts.js')

    const svg = horizontalBarChart(
      [
        {
          name: 'This is a very long model name that should not overflow the chart area',
          value: 42,
          color: '#123456',
        },
      ],
      {
        title: 'Top models',
        getValue: (entry) => entry.value,
        getLabel: (entry) => entry.name,
        getColor: (entry) => entry.color,
      },
    )

    expect(svg).toContain('This is a very long model name th…')
  })
})
