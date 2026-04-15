import type { DailyUsage } from '@/types'
import { normalizeModelName } from './model-utils'
import { localToday } from './formatters'
import { buildCsvLine } from './csv'

/** Serializes dashboard usage rows to a CSV export payload. */
export function generateCSV(data: DailyUsage[]): string {
  const header = buildCsvLine([
    'date',
    'totalCost',
    'totalTokens',
    'inputTokens',
    'outputTokens',
    'cacheCreationTokens',
    'cacheReadTokens',
    'thinkingTokens',
    'requestCount',
    'models',
  ])
  const rows = data.map((d) => {
    const models = d.modelBreakdowns
      .map((mb) => normalizeModelName(mb.modelName))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join('; ')
    return buildCsvLine([
      d.date,
      d.totalCost.toFixed(2),
      d.totalTokens,
      d.inputTokens,
      d.outputTokens,
      d.cacheCreationTokens,
      d.cacheReadTokens,
      d.thinkingTokens,
      d.requestCount,
      models,
    ])
  })
  return [header, ...rows].join('\n')
}

/** Downloads the current usage dataset as a CSV file. */
export function downloadCSV(data: DailyUsage[]) {
  const csv = generateCSV(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ttdash-export-${localToday()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
