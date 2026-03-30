import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatTokens, formatDate } from '@/lib/formatters'
import { normalizeModelName, getModelColor } from '@/lib/model-utils'
import type { DailyUsage } from '@/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface RecentDaysProps {
  data: DailyUsage[]
  onClickDay?: (date: string) => void
}

export function RecentDays({ data, onClickDay }: RecentDaysProps) {
  const [showAll, setShowAll] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
  const displayed = showAll ? sorted : sorted.slice(0, 30)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Letzte {showAll ? sorted.length : Math.min(30, sorted.length)} Tage im Detail
        </CardTitle>
        {sorted.length > 30 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Weniger anzeigen' : 'Alle anzeigen'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Datum</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">Kosten</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">Tokens</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">Input</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">Output</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">Cache Write</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">Cache Read</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">$/1M</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Modelle</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(day => {
                const costPerM = day.totalTokens > 0 ? day.totalCost / (day.totalTokens / 1_000_000) : 0
                const isExpanded = expandedRow === day.date
                return (
                  <tr
                    key={day.date}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => {
                      if (onClickDay) onClickDay(day.date)
                      setExpandedRow(isExpanded ? null : day.date)
                    }}
                  >
                    <td className="px-2 py-2.5 whitespace-nowrap">{formatDate(day.date, 'long')}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{formatCurrency(day.totalCost)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{formatTokens(day.totalTokens)}</td>
                    <td className="px-2 py-2.5 text-right font-mono hidden md:table-cell">{formatTokens(day.inputTokens)}</td>
                    <td className="px-2 py-2.5 text-right font-mono hidden md:table-cell">{formatTokens(day.outputTokens)}</td>
                    <td className="px-2 py-2.5 text-right font-mono hidden lg:table-cell">{formatTokens(day.cacheCreationTokens)}</td>
                    <td className="px-2 py-2.5 text-right font-mono hidden lg:table-cell">{formatTokens(day.cacheReadTokens)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">${costPerM.toFixed(2)}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {day.modelBreakdowns
                          .map(mb => normalizeModelName(mb.modelName))
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .map(name => (
                            <span
                              key={name}
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${getModelColor(name)}20`,
                                color: getModelColor(name),
                              }}
                            >
                              {name}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
