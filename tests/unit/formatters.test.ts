import { describe, expect, it } from 'vitest'
import { formatTokens } from '@/lib/formatters'

describe('formatters', () => {
  it('formats positive and negative token counts with matching compact thresholds', () => {
    expect(formatTokens(21_400_000)).toBe('21.4M')
    expect(formatTokens(-21_400_000)).toBe('-21.4M')
    expect(formatTokens(1_250_000_000)).toBe('1.3B')
    expect(formatTokens(-1_250_000_000)).toBe('-1.3B')
    expect(formatTokens(12_500)).toBe('12.5k')
    expect(formatTokens(-12_500)).toBe('-12.5k')
    expect(formatTokens(420)).toBe('420')
    expect(formatTokens(-420)).toBe('-420')
    expect(formatTokens(42)).toBe('42.0')
    expect(formatTokens(-42)).toBe('-42.0')
    expect(formatTokens(4.2)).toBe('4.20')
    expect(formatTokens(-4.2)).toBe('-4.20')
    expect(formatTokens(0.125)).toBe('0.125')
    expect(formatTokens(-0.125)).toBe('-0.125')
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(Number.NaN)).toBe('0')
  })
})
