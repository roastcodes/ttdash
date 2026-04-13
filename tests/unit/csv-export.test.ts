import { describe, expect, it } from 'vitest'
import { generateCSV } from '@/lib/csv-export'
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
})
