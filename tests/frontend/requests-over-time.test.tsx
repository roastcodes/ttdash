// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequestsOverTime } from '@/components/charts/RequestsOverTime'
import { initI18n } from '@/lib/i18n'
import type { RequestChartDataPoint } from '@/types'
import { MockSvgContainer, MockSvgGroup } from '../recharts-test-utils'
import { renderWithTooltip } from '../test-utils'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  ComposedChart: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  PieChart: ({ children }: { children: ReactNode }) => (
    <MockSvgContainer>{children}</MockSvgContainer>
  ),
  Pie: ({ children }: { children: ReactNode }) => <MockSvgGroup>{children}</MockSvgGroup>,
  Cell: () => null,
  Area: ({ name, dataKey }: { name?: string; dataKey?: string }) => (
    <MockSvgGroup data-testid="request-area" data-name={name ?? ''} data-key={dataKey ?? ''} />
  ),
  Line: ({ name, dataKey }: { name?: string; dataKey?: string }) => (
    <MockSvgGroup data-testid="request-line" data-name={name ?? ''} data-key={dataKey ?? ''} />
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

function buildRequestPoint(
  date: string,
  modelRequests: Record<string, number>,
  modelAverages: Record<string, number | undefined> = {},
): RequestChartDataPoint {
  const totalRequests = Object.values(modelRequests).reduce((sum, value) => sum + value, 0)
  const point: RequestChartDataPoint = {
    date,
    totalRequests,
    totalRequestsMA7: totalRequests,
  }

  for (const [model, value] of Object.entries(modelRequests)) {
    point[model] = value
  }

  for (const [model, value] of Object.entries(modelAverages)) {
    point[`${model}_ma7`] = value
  }

  return point
}

describe('RequestsOverTime', () => {
  beforeAll(async () => {
    await initI18n('en')
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all model lines instead of truncating the chart to the top five models', () => {
    const data: RequestChartDataPoint[] = [
      buildRequestPoint('2026-04-01', {
        'GPT-5.4': 120,
        'Claude Sonnet 4.5': 90,
        'Claude Opus 4.7': 80,
        'Gemini 2.5 Pro': 70,
        'GPT-4.1': 60,
        'Claude Haiku 4.5': 50,
      }),
    ]

    renderWithTooltip(<RequestsOverTime data={data} />)

    const lineNames = screen
      .getAllByTestId('request-line')
      .map((line) => line.getAttribute('data-name'))
      .filter(Boolean)

    expect(lineNames).toEqual(
      expect.arrayContaining([
        'GPT-5.4',
        'Claude Sonnet 4.5',
        'Claude Opus 4.7',
        'Gemini 2.5 Pro',
        'GPT-4.1',
        'Claude Haiku 4.5',
      ]),
    )
  })

  it('shows all non-zero model moving-average lines in the expanded trend view and skips zero-only series', () => {
    const data: RequestChartDataPoint[] = [
      buildRequestPoint(
        '2026-04-01',
        {
          'GPT-5.4': 120,
          'Claude Sonnet 4.5': 90,
          'Claude Opus 4.7': 80,
          'Gemini 2.5 Pro': 70,
          'GPT-4.1': 60,
          'Claude Haiku 4.5': 50,
          'Unused Model': 0,
        },
        {
          'GPT-5.4': 120,
          'Claude Sonnet 4.5': 90,
          'Claude Opus 4.7': 80,
          'Gemini 2.5 Pro': 70,
          'GPT-4.1': 60,
          'Claude Haiku 4.5': 50,
          'Unused Model': 0,
        },
      ),
      buildRequestPoint(
        '2026-04-02',
        {
          'GPT-5.4': 130,
          'Claude Sonnet 4.5': 95,
          'Claude Opus 4.7': 85,
          'Gemini 2.5 Pro': 72,
          'GPT-4.1': 64,
          'Claude Haiku 4.5': 53,
          'Unused Model': 0,
        },
        {
          'GPT-5.4': 125,
          'Claude Sonnet 4.5': 92,
          'Claude Opus 4.7': 82,
          'Gemini 2.5 Pro': 71,
          'GPT-4.1': 62,
          'Claude Haiku 4.5': 51,
          'Unused Model': 0,
        },
      ),
    ]

    renderWithTooltip(<RequestsOverTime data={data} />)

    fireEvent.click(screen.getByRole('button', { name: 'Requests over time expand' }))

    const lineNames = screen
      .getAllByTestId('request-line')
      .map((line) => line.getAttribute('data-name'))
      .filter(Boolean)

    expect(lineNames).toEqual(
      expect.arrayContaining([
        'Claude Opus 4.7',
        'Claude Opus 4.7 7-day avg',
        'Claude Haiku 4.5 7-day avg',
      ]),
    )
    expect(lineNames).not.toEqual(
      expect.arrayContaining(['Unused Model', 'Unused Model 7-day avg']),
    )
  })
})
