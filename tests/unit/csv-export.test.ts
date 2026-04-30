import { describe, expect, it, vi } from 'vitest'
import { downloadCSV, generateCSV } from '@/lib/csv-export'
import { buildCsvLine, stringifyCsvCell } from '@/lib/csv'
import type { DailyUsage } from '@/types'

function createDay(modelName: string): DailyUsage {
  return {
    date: '2026-04-13',
    inputTokens: 10,
    outputTokens: 20,
    cacheCreationTokens: 5,
    cacheReadTokens: 15,
    thinkingTokens: 0,
    totalTokens: 50,
    totalCost: 1.23,
    requestCount: 2,
    modelsUsed: [modelName],
    modelBreakdowns: [
      {
        modelName,
        inputTokens: 10,
        outputTokens: 20,
        cacheCreationTokens: 5,
        cacheReadTokens: 15,
        thinkingTokens: 0,
        cost: 1.23,
        requestCount: 2,
      },
    ],
  }
}

describe('csv export helpers', () => {
  it('escapes quotes, commas, and newlines in CSV cells', () => {
    expect(stringifyCsvCell('alpha "beta",gamma')).toBe('"alpha ""beta"",gamma"')
    expect(stringifyCsvCell('first line\nsecond line')).toBe('"first line\nsecond line"')
  })

  it('builds quoted CSV lines consistently', () => {
    expect(buildCsvLine(['model', 'cost', 1.23])).toBe('"model","cost","1.23"')
  })

  it('escapes normalized model names in the dashboard CSV export', () => {
    const csv = generateCSV([createDay('gpt-4 "test"')])

    expect(csv).toContain('"models"')
    expect(csv).toContain('"GPT-4 ""test"""')
  })

  it('exports only the header row when the usage dataset is empty', () => {
    expect(generateCSV([])).toBe(
      [
        '"date"',
        '"totalCost"',
        '"totalTokens"',
        '"inputTokens"',
        '"outputTokens"',
        '"cacheCreationTokens"',
        '"cacheReadTokens"',
        '"thinkingTokens"',
        '"requestCount"',
        '"models"',
      ].join(','),
    )
  })

  it('deduplicates normalized model names in each exported day', () => {
    const day = createDay('gpt-4')
    const csv = generateCSV([
      {
        ...day,
        modelBreakdowns: [
          { ...day.modelBreakdowns[0]!, modelName: 'gpt-4' },
          { ...day.modelBreakdowns[0]!, modelName: 'GPT-4' },
          { ...day.modelBreakdowns[0]!, modelName: 'claude sonnet 4.5' },
        ],
      },
    ])

    expect(csv).toContain('"GPT-4; Claude Sonnet 4.5"')
  })

  it('downloads the generated CSV with a local-date filename and revokes the object URL', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-13T10:30:00Z'))
    const click = vi.fn()
    const anchor = {
      click,
      download: '',
      href: '',
    }
    const createElement = vi.fn(() => anchor)
    const createObjectURL = vi.fn(() => 'blob:ttdash-export')
    const revokeObjectURL = vi.fn()

    vi.stubGlobal('document', { createElement })
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    try {
      downloadCSV([createDay('gpt-4')])

      const [blob] = createObjectURL.mock.calls[0]!
      expect(blob).toBeInstanceOf(Blob)
      expect((blob as Blob).type).toBe('text/csv;charset=utf-8;')
      expect(createElement).toHaveBeenCalledWith('a')
      expect(anchor.href).toBe('blob:ttdash-export')
      expect(anchor.download).toBe('ttdash-export-2026-04-13.csv')
      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:ttdash-export')
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
  })
})
