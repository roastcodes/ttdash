import { describe, expect, it } from 'vitest'
import { computeCacheROI } from '@/lib/cache-roi-data'
import { resolveModelPrice } from '@/lib/model-pricing'
import { createDailyUsage } from '../factories'

describe('cache pricing estimates', () => {
  it('resolves normalized names and provider aliases without borrowing Copilot prices', () => {
    expect(resolveModelPrice('claude-sonnet-4-6-20260101::anthropic')).toMatchObject({
      modelId: 'claude-sonnet-4-6',
      input: 3,
    })
    expect(resolveModelPrice('Claude Sonnet 4.6')).toMatchObject({ input: 3 })
    expect(resolveModelPrice('claude-sonnet-4-6::github-copilot')).toBeNull()
    expect(resolveModelPrice('unknown')).toBeNull()
  })

  it('includes write premiums as a TTL range and permits a net cache loss', () => {
    const result = computeCacheROI([
      createDailyUsage({
        modelName: 'claude-sonnet-4-6',
        totalCost: 10,
        cacheReadTokens: 1_000_000,
        cacheCreationTokens: 2_000_000,
      }),
    ])
    expect(result.actualCost).toBe(10)
    expect(result.savingsMin).toBeCloseTo(-3.3)
    expect(result.savingsMax).toBeCloseTo(1.2)
    expect(result.hasRange).toBe(true)
    expect(result.costCoverage).toBe(100)
  })

  it('excludes unknown prices and unallocated amounts from benefit and shows coverage', () => {
    const known = createDailyUsage({ modelName: 'gpt-5', totalCost: 1, cacheReadTokens: 1_000_000 })
    const unknown = createDailyUsage({
      date: '2026-04-02',
      modelName: 'unknown',
      totalCost: 9,
      cacheReadTokens: 1_000_000,
    })
    const result = computeCacheROI([known, unknown])
    expect(result.actualCost).toBe(1)
    expect(result.totalCost).toBe(10)
    expect(result.costCoverage).toBe(10)
    expect(result.savingsMin).toBeCloseTo(1.125)
    expect(result.unsupportedModels).toEqual(['Unknown'])
    expect(computeCacheROI([unknown]).hasEstimate).toBe(false)
  })
})
