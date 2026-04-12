import { describe, expect, it } from 'vitest'
import { buildChartCsv, stringifyCsvCell } from '@/components/charts/ChartCard'
import {
  buildProviderLimitsState,
  reorderSections,
} from '@/components/features/settings/SettingsModal'
import { parseEventData } from '@/lib/auto-import'

describe('phase 1 helper fixes', () => {
  it('reorders sections to the target slot when dragging downward', () => {
    expect(reorderSections(['metrics', 'activity', 'tables'], 'metrics', 'tables')).toEqual([
      'activity',
      'metrics',
      'tables',
    ])
  })

  it('replaces provider limit state instead of preserving stale providers', () => {
    expect(
      buildProviderLimitsState(['OpenAI', 'Anthropic'], {
        OpenAI: {
          monthlyLimit: 120,
          hasSubscription: false,
          subscriptionPrice: 0,
        },
        Anthropic: {
          monthlyLimit: 0,
          hasSubscription: true,
          subscriptionPrice: 50,
        },
        Legacy: {
          monthlyLimit: 999,
          hasSubscription: true,
          subscriptionPrice: 999,
        },
      }),
    ).toEqual({
      OpenAI: {
        monthlyLimit: 120,
        hasSubscription: false,
        subscriptionPrice: 0,
      },
      Anthropic: {
        monthlyLimit: 0,
        hasSubscription: true,
        subscriptionPrice: 50,
      },
    })
  })

  it('returns null for malformed or non-object auto-import events', () => {
    expect(parseEventData(new MessageEvent('message', { data: '{"message":"ok"}' }))).toEqual({
      message: 'ok',
    })
    expect(parseEventData(new MessageEvent('message', { data: '{"message"' }))).toBeNull()
    expect(parseEventData(new MessageEvent('message', { data: '[]' }))).toBeNull()
    expect(parseEventData(new MessageEvent('message', { data: '"oops"' }))).toBeNull()
  })

  it('quotes CSV cells and preserves commas, quotes, and newlines', () => {
    expect(stringifyCsvCell('value,with,"quotes"\nand newline')).toBe(
      '"value,with,""quotes""\nand newline"',
    )
    expect(
      buildChartCsv([
        {
          label: 'hello,world',
          note: 'line 1\nline 2',
          quote: '"quoted"',
        },
      ]),
    ).toBe('"label","note","quote"\n"hello,world","line 1\nline 2","""quoted"""')
  })
})
