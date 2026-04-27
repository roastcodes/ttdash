import { describe, expect, it } from 'vitest'
import {
  deriveRequestQualityData,
  resolveRequestQualityAverageUnit,
} from '@/lib/request-quality-data'
import type { DashboardMetrics } from '@/types'

const baseMetrics: DashboardMetrics = {
  totalCost: 0,
  totalTokens: 0,
  totalInput: 0,
  totalOutput: 0,
  totalCacheCreate: 0,
  totalCacheRead: 0,
  totalThinking: 0,
  totalRequests: 0,
  activeDays: 0,
  avgDailyCost: 0,
  avgTokensPerRequest: 0,
  avgCostPerRequest: 0,
  peakDay: null,
  cacheHitRate: 0,
  modelCount: 0,
  providerCount: 0,
  topModels: [],
  topRequestModel: null,
  dailyBurnRate: 0,
  requestVolatility: 0,
  providerConcentrationIndex: 0,
  topProvider: null,
  hasRequestData: false,
}

describe('request quality data', () => {
  it('derives per-request quality metrics and bounded progress values', () => {
    const data = deriveRequestQualityData(
      {
        ...baseMetrics,
        totalInput: 500,
        totalOutput: 250,
        totalCacheRead: 300_000,
        totalThinking: 30_000,
        totalRequests: 3,
        activeDays: 2,
        avgTokensPerRequest: 250_000,
        avgCostPerRequest: 0.5,
        cacheHitRate: 42,
        topRequestModel: { name: 'GPT-5.4', requests: 3 },
      },
      'daily',
    )

    expect(data.cachePerRequest).toBe(100_000)
    expect(data.thinkingPerRequest).toBe(10_000)
    expect(data.inputOutputRatio).toBe(2)
    expect(data.requestDensity).toBe(1.5)
    expect(data.qualityMetrics).toEqual([
      expect.objectContaining({ id: 'tokensPerRequest', progress: 1 }),
      expect.objectContaining({ id: 'costPerRequest', progress: 1 }),
      expect.objectContaining({ id: 'cachePerRequest', progress: 0.5 }),
      expect.objectContaining({ id: 'thinkingPerRequest', progress: 1 }),
    ])
    expect(data.summaryMetrics).toEqual([
      { id: 'requestDensity', value: 1.5 },
      { id: 'cacheHitRate', value: 42 },
      { id: 'inputOutput', value: 2 },
      { id: 'topRequestModel', value: 3 },
    ])
  })

  it('keeps zero-safe ratios when request data is absent', () => {
    const data = deriveRequestQualityData(baseMetrics, 'monthly')

    expect(data.cachePerRequest).toBe(0)
    expect(data.thinkingPerRequest).toBe(0)
    expect(data.inputOutputRatio).toBe(0)
    expect(data.requestDensity).toBe(0)
    expect(data.qualityMetrics.every((metric) => metric.progress === 0)).toBe(true)
  })

  it('maps dashboard view mode to the displayed average unit', () => {
    expect(resolveRequestQualityAverageUnit('daily')).toBe('day')
    expect(resolveRequestQualityAverageUnit('monthly')).toBe('month')
    expect(resolveRequestQualityAverageUnit('yearly')).toBe('year')
  })
})
