import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { formatCurrency, formatTokens, formatPercent, formatDate } from '@/lib/formatters'
import { FormattedValue } from '@/components/ui/formatted-value'
import {
  normalizeModelName,
  getModelColor,
  getModelProvider,
  getProviderBadgeClasses,
} from '@/lib/model-utils'
import { cn } from '@/lib/cn'
import type { DailyUsage } from '@/types'

interface DrillDownModalProps {
  day: DailyUsage | null
  contextData?: DailyUsage[]
  open: boolean
  onClose: () => void
}

export function DrillDownModal({ day, contextData = [], open, onClose }: DrillDownModalProps) {
  const { t } = useTranslation()
  const modelData = useMemo(() => {
    if (!day) return []
    const map = new Map<
      string,
      {
        cost: number
        tokens: number
        input: number
        output: number
        cacheRead: number
        cacheCreate: number
        thinking: number
        requests: number
      }
    >()
    for (const mb of day.modelBreakdowns) {
      const name = normalizeModelName(mb.modelName)
      const ex = map.get(name) ?? {
        cost: 0,
        tokens: 0,
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheCreate: 0,
        thinking: 0,
        requests: 0,
      }
      ex.cost += mb.cost
      ex.tokens +=
        mb.inputTokens +
        mb.outputTokens +
        mb.cacheCreationTokens +
        mb.cacheReadTokens +
        mb.thinkingTokens
      ex.input += mb.inputTokens
      ex.output += mb.outputTokens
      ex.cacheRead += mb.cacheReadTokens
      ex.cacheCreate += mb.cacheCreationTokens
      ex.thinking += mb.thinkingTokens
      ex.requests += mb.requestCount
      map.set(name, ex)
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cost - a.cost)
  }, [day])

  if (!day) return null

  const tokensTotal =
    day.cacheReadTokens +
    day.cacheCreationTokens +
    day.inputTokens +
    day.outputTokens +
    day.thinkingTokens
  const hasTokens = tokensTotal > 0

  const cacheRate = hasTokens ? (day.cacheReadTokens / tokensTotal) * 100 : 0

  const pieData = modelData.map((m) => ({ name: m.name, value: m.cost }))
  const avgTokensPerRequest = day.requestCount > 0 ? tokensTotal / day.requestCount : 0
  const avgCostPerRequest = day.requestCount > 0 ? day.totalCost / day.requestCount : 0
  const costPerMillion = hasTokens ? day.totalCost / (tokensTotal / 1_000_000) : null
  const costRanking =
    [...contextData]
      .sort((a, b) => b.totalCost - a.totalCost)
      .findIndex((entry) => entry.date === day.date) + 1
  const requestRanking =
    [...contextData]
      .sort((a, b) => b.requestCount - a.requestCount)
      .findIndex((entry) => entry.date === day.date) + 1
  const previousSeven = [...contextData]
    .filter((entry) => entry.date < day.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7)
  const avgCost7 =
    previousSeven.length > 0
      ? previousSeven.reduce((sum, entry) => sum + entry.totalCost, 0) / previousSeven.length
      : null
  const avgRequests7 =
    previousSeven.length > 0
      ? previousSeven.reduce((sum, entry) => sum + entry.requestCount, 0) / previousSeven.length
      : null
  const topRequestModel = modelData.reduce(
    (best, current) => {
      if (!best || current.requests > best.requests) return current
      return best
    },
    null as (typeof modelData)[number] | null,
  )
  const formatTokenShare = (value: number) =>
    hasTokens ? formatPercent((value / tokensTotal) * 100) : '–'
  const tokenSegments = [
    {
      id: 'cacheRead',
      value: day.cacheReadTokens,
      color: 'hsl(160, 50%, 42%)',
      label: t('drillDown.tokenSegments.cacheRead'),
    },
    {
      id: 'cacheWrite',
      value: day.cacheCreationTokens,
      color: 'hsl(262, 60%, 55%)',
      label: t('drillDown.tokenSegments.cacheWrite'),
    },
    { id: 'input', value: day.inputTokens, color: 'hsl(340, 55%, 52%)', label: t('common.input') },
    {
      id: 'output',
      value: day.outputTokens,
      color: 'hsl(35, 80%, 52%)',
      label: t('common.output'),
    },
    {
      id: 'thinking',
      value: day.thinkingTokens,
      color: 'hsl(12, 78%, 56%)',
      label: t('common.thinking'),
    },
  ] as const

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {formatDate(day.date, 'long')} — {formatCurrency(day.totalCost)}
          </DialogTitle>
          <DialogDescription>{t('drillDown.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">{t('common.tokens')}</div>
            <div className="font-mono font-medium">
              <FormattedValue value={tokensTotal} type="tokens" />
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">$/1M</div>
            <div className="font-mono font-medium">
              {costPerMillion !== null ? (
                <FormattedValue value={costPerMillion} type="currency" />
              ) : (
                '–'
              )}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">{t('drillDown.cacheRate')}</div>
            <div className="font-mono font-medium">
              <FormattedValue value={cacheRate} type="percent" />
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">{t('common.models')}</div>
            <div className="font-mono font-medium">{modelData.length}</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">{t('common.requests')}</div>
            <div className="font-mono font-medium">
              <FormattedValue value={day.requestCount} type="number" />
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">{t('common.thinking')}</div>
            <div className="font-mono font-medium">
              <FormattedValue value={day.thinkingTokens} type="tokens" />
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">{t('drillDown.tokensPerRequest')}</div>
            <div className="font-mono font-medium">
              <FormattedValue value={avgTokensPerRequest} type="tokens" />
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">{t('drillDown.costPerRequest')}</div>
            <div className="font-mono font-medium">
              <FormattedValue value={avgCostPerRequest} type="currency" />
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">{t('drillDown.costRank')}</div>
            <div className="font-mono font-medium">{costRanking > 0 ? `#${costRanking}` : '–'}</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">{t('drillDown.requestRank')}</div>
            <div className="font-mono font-medium">
              {requestRanking > 0 ? `#${requestRanking}` : '–'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <div className="text-muted-foreground">{t('drillDown.topRequestModel')}</div>
            <div className="mt-1 font-medium">{topRequestModel?.name ?? '–'}</div>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <div className="text-muted-foreground">{t('drillDown.costVsAverage7d')}</div>
            <div className="mt-1 font-medium">
              {avgCost7 !== null
                ? `${day.totalCost >= avgCost7 ? '↑' : '↓'} ${formatCurrency(Math.abs(day.totalCost - avgCost7))}`
                : '–'}
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
            <div className="text-muted-foreground">{t('drillDown.requestsVsAverage7d')}</div>
            <div className="mt-1 font-medium">
              {avgRequests7 !== null
                ? `${day.requestCount >= avgRequests7 ? '↑' : '↓'} ${Math.abs(day.requestCount - avgRequests7).toFixed(0)}`
                : '–'}
            </div>
          </div>
        </div>

        {/* Token type stacked bar */}
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">
            {t('drillDown.tokenDistribution')}
          </div>
          <div className="flex h-3 rounded-full overflow-hidden">
            {hasTokens &&
              tokenSegments.map((seg) => (
                <div
                  key={seg.id}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(seg.value / tokensTotal) * 100}%`,
                    backgroundColor: seg.color,
                  }}
                  title={`${seg.label}: ${formatTokens(seg.value)} (${((seg.value / tokensTotal) * 100).toFixed(1)}%)`}
                />
              ))}
          </div>
          <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
            {tokenSegments.map((segment) => (
              <span key={segment.id} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label} {formatTokenShare(segment.value)}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={getModelColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {modelData.map((model) => {
              const share = day.totalCost > 0 ? (model.cost / day.totalCost) * 100 : 0
              return (
                <div
                  key={model.name}
                  className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getModelColor(model.name) }}
                    />
                    <span>{model.name}</span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none',
                        getProviderBadgeClasses(getModelProvider(model.name)),
                      )}
                    >
                      {getModelProvider(model.name)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatPercent(share)}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <div>
                      <span className="font-medium">
                        <FormattedValue value={model.cost} type="currency" />
                      </span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        <FormattedValue value={model.tokens} type="tokens" />
                      </span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {t('drillDown.requestCountShort', { count: model.requests })}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {model.requests > 0
                        ? t('drillDown.modelRequestSummary', {
                            costPerRequest: formatCurrency(model.cost / model.requests),
                            tokensPerRequest: formatTokens(model.tokens / model.requests),
                          })
                        : t('drillDown.noRequests')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
