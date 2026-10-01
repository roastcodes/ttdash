import { describe, expect, it } from 'vitest'
import { toDistributionBins } from '@/lib/chart-distributions'

describe('distribution bins', () => {
  it('represents empty, single, zero and identical values without reversed ranges', () => {
    expect(toDistributionBins([], String)).toEqual([])
    for (const values of [[0], [0, 0, 0], [47, 47]]) {
      const bins = toDistributionBins(values, String)
      expect(bins).toHaveLength(1)
      expect(bins[0]).toMatchObject({
        rangeStart: values[0],
        rangeEnd: values[0],
        count: values.length,
      })
    }
  })

  it('keeps every observation including both endpoints and distinguishes compact labels', () => {
    const values = Array.from({ length: 100 }, (_, i) => 4700 + i / 100)
    const bins = toDistributionBins(values, () => '4.7k')
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(100)
    expect(bins[0]?.rangeStart).toBe(values[0])
    expect(bins.at(-1)?.rangeEnd).toBe(values.at(-1))
    expect(new Set(bins.map((bin) => bin.label)).size).toBe(bins.length)
    expect(bins.every((bin) => bin.rangeStart < bin.rangeEnd && bin.label !== '4.7k–4.7k')).toBe(
      true,
    )
    expect(bins[0]?.exactLabel).toBe(`${bins[0]?.rangeStart}–${bins[0]?.rangeEnd}`)
  })
})
