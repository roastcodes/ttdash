import { describe, expect, it } from 'vitest'

describe('report charts', () => {
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

    expect(svg).toContain('This is a very long model nam…')
  })
})
