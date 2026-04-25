// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useComputedMetrics } from '@/hooks/use-computed-metrics'
import { dashboardFixture } from '../fixtures/usage-data'

describe('useComputedMetrics', () => {
  it('returns stable dashboard metrics, model summaries, and chart-ready slices', () => {
    const { result } = renderHook(() => useComputedMetrics(dashboardFixture, 'en-US'))

    expect(result.current.metrics.totalCost).toBe(30)
    expect(result.current.allModels).toEqual(['Claude Sonnet 4.5', 'GPT-5.4', 'Gemini 2.5 Pro'])
    expect(result.current.modelCosts.get('GPT-5.4')).toMatchObject({
      cost: 17,
      tokens: 560,
      requests: 10,
      days: 3,
    })
    expect(result.current.providerMetrics.get('OpenAI')).toMatchObject({
      cost: 17,
      tokens: 560,
      requests: 10,
      days: 3,
    })
    expect(result.current.modelPieData[0]).toEqual({ name: 'GPT-5.4', value: 17 })
    expect(result.current.tokenPieData).toEqual([
      { name: 'Input', value: 560 },
      { name: 'Output', value: 280 },
      { name: 'Cache Write', value: 60 },
      { name: 'Cache Read', value: 80 },
      { name: 'Thinking', value: 20 },
    ])
    expect(result.current.costChartData).toHaveLength(dashboardFixture.length)
    expect(result.current.requestChartData).toHaveLength(dashboardFixture.length)
  })
})
