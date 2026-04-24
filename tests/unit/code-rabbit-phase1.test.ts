import { describe, expect, it } from 'vitest'
import { buildChartCsv, stringifyCsvCell } from '@/components/charts/ChartCard'
import { parseEventData } from '@/lib/auto-import'

describe('phase 1 helper fixes', () => {
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
