import type { DailyUsage } from '@/types'
import { normalizeModelName } from './model-utils'

export function generateCSV(data: DailyUsage[]): string {
  const header = 'date,totalCost,totalTokens,inputTokens,outputTokens,cacheCreationTokens,cacheReadTokens,models'
  const rows = data.map(d => {
    const models = d.modelBreakdowns
      .map(mb => normalizeModelName(mb.modelName))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join('; ')
    return `${d.date},${d.totalCost.toFixed(2)},${d.totalTokens},${d.inputTokens},${d.outputTokens},${d.cacheCreationTokens},${d.cacheReadTokens},"${models}"`
  })
  return [header, ...rows].join('\n')
}

export function downloadCSV(data: DailyUsage[]) {
  const csv = generateCSV(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ccusage-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
