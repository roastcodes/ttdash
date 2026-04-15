import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormattedValue } from '@/components/ui/formatted-value'
import { InfoHeading } from '@/components/features/help/InfoHeading'
import { FEATURE_HELP } from '@/lib/help-content'
import {
  formatPercent,
  formatTokens,
  periodUnit,
  periodLabel,
  formatNumber,
} from '@/lib/formatters'
import {
  getModelColor,
  getModelColorAlpha,
  getModelProvider,
  getProviderBadgeClasses,
} from '@/lib/model-utils'
import { cn } from '@/lib/cn'
import { ArrowUpDown } from 'lucide-react'
import type { ViewMode } from '@/types'

interface ModelData {
  name: string
  cost: number
  tokens: number
  costPerMillion: number
  costPerRequest: number
  tokensPerRequest: number
  share: number
  requestShare: number
  cacheShare: number
  thinkingShare: number
  days: number
  requests: number
  costPerDay: number
}

interface ModelEfficiencyProps {
  modelCosts: Map<
    string,
    {
      cost: number
      tokens: number
      input?: number
      output?: number
      cacheRead?: number
      cacheCreate?: number
      thinking?: number
      days: number
      requests: number
      costPerDay?: number
    }
  >
  totalCost: number
  viewMode?: ViewMode
}

type SortKey =
  | 'cost'
  | 'tokens'
  | 'costPerMillion'
  | 'costPerRequest'
  | 'tokensPerRequest'
  | 'share'
  | 'requestShare'
  | 'cacheShare'
  | 'thinkingShare'
  | 'days'
  | 'requests'
  | 'costPerDay'

/** Renders the sortable model efficiency table. */
export function ModelEfficiency({
  modelCosts,
  totalCost,
  viewMode = 'daily',
}: ModelEfficiencyProps) {
  const { t } = useTranslation()
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortAsc, setSortAsc] = useState(false)

  const models = useMemo<ModelData[]>(
    () =>
      Array.from(modelCosts.entries()).map(([name, v]) => ({
        name,
        cost: v.cost,
        tokens: v.tokens,
        costPerMillion: v.tokens > 0 ? v.cost / (v.tokens / 1_000_000) : 0,
        costPerRequest: v.requests > 0 ? v.cost / v.requests : 0,
        tokensPerRequest: v.requests > 0 ? v.tokens / v.requests : 0,
        share: totalCost > 0 ? (v.cost / totalCost) * 100 : 0,
        requestShare: 0,
        cacheShare: v.tokens > 0 ? ((v.cacheRead ?? 0) / v.tokens) * 100 : 0,
        thinkingShare: v.tokens > 0 ? ((v.thinking ?? 0) / v.tokens) * 100 : 0,
        days: v.days,
        requests: v.requests,
        costPerDay: v.days > 0 ? v.cost / v.days : 0,
      })),
    [modelCosts, totalCost],
  )

  const totalRequests = useMemo(
    () => models.reduce((sum, model) => sum + model.requests, 0),
    [models],
  )
  const enrichedModels = useMemo(
    () =>
      models.map((model) => ({
        ...model,
        requestShare: totalRequests > 0 ? (model.requests / totalRequests) * 100 : 0,
      })),
    [models, totalRequests],
  )

  const sorted = useMemo(
    () =>
      [...enrichedModels].sort((a, b) => {
        const diff = a[sortKey] - b[sortKey]
        return sortAsc ? diff : -diff
      }),
    [enrichedModels, sortAsc, sortKey],
  )

  const topModel = sorted[0] ?? null
  const mostEfficient = useMemo(
    () =>
      [...models]
        .filter((model) => model.tokens > 0)
        .sort((a, b) => a.costPerMillion - b.costPerMillion)[0] ?? null,
    [models],
  )

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const getAriaSort = (field: SortKey): 'ascending' | 'descending' | 'none' =>
    sortKey === field ? (sortAsc ? 'ascending' : 'descending') : 'none'

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      aria-sort={getAriaSort(field)}
      className={cn(
        'px-3 py-2 text-right text-xs font-medium',
        sortKey === field ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {label}
        <ArrowUpDown
          aria-hidden="true"
          className={cn('h-3 w-3', sortKey === field && 'text-primary')}
        />
      </button>
    </th>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <InfoHeading info={FEATURE_HELP.modelEfficiency}>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('tables.modelEfficiency.title')}
              </CardTitle>
            </InfoHeading>
            <span className="text-xs text-muted-foreground">
              {t('tables.modelEfficiency.count', { count: models.length })}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t('tables.modelEfficiency.topModel')}
              </div>
              <div className="mt-1 text-sm font-medium">{topModel?.name ?? '–'}</div>
              <div className="text-xs text-muted-foreground">
                {topModel
                  ? t('tables.modelEfficiency.share', { value: formatPercent(topModel.share, 0) })
                  : '–'}
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t('tables.modelEfficiency.mostEfficient')}
              </div>
              <div className="mt-1 text-sm font-medium">{mostEfficient?.name ?? '–'}</div>
              <div className="text-xs text-muted-foreground">
                {mostEfficient
                  ? t('tables.modelEfficiency.share', {
                      value: formatPercent(mostEfficient.share, 0),
                    })
                  : '–'}
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t('tables.modelEfficiency.totalRequests')}
              </div>
              <div className="mt-1 text-sm font-medium">{formatNumber(totalRequests)}</div>
              <div className="text-xs text-muted-foreground">
                {models.length > 0
                  ? t('tables.modelEfficiency.perModel', {
                      value: (totalRequests / models.length).toFixed(0),
                    })
                  : '–'}
              </div>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
              <div className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t('tables.modelEfficiency.topModelTokens')}
              </div>
              <div className="mt-1 text-sm font-medium">
                {topModel ? formatTokens(topModel.tokens) : '–'}
              </div>
              <div className="text-xs text-muted-foreground">
                {topModel ? `${topModel.days} ${periodLabel(viewMode, true)}` : '–'}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:hidden">
          {sorted.map((model) => (
            <div key={model.name} className="rounded-xl border border-border/50 bg-muted/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getModelColor(model.name) }}
                    />
                    <span className="truncate font-medium">{model.name}</span>
                  </div>
                  <div className="mt-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium text-muted-foreground">
                    {getModelProvider(model.name)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold">
                    <FormattedValue value={model.cost} type="currency" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('tables.modelEfficiency.share', { value: formatPercent(model.share, 1) })}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">{t('tables.modelEfficiency.tokens')}</div>
                  <div className="mt-1 font-mono">{formatTokens(model.tokens)}</div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">
                    {t('tables.modelEfficiency.costPerMillion')}
                  </div>
                  <div className="mt-1 font-mono">
                    <FormattedValue value={model.costPerMillion} type="currency" />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">{t('common.requests')}</div>
                  <div className="mt-1 font-mono">{formatNumber(model.requests)}</div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">
                    {t('tables.modelEfficiency.costPerReq')}
                  </div>
                  <div className="mt-1 font-mono">
                    <FormattedValue value={model.costPerRequest} type="currency" />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">
                    {t('tables.modelEfficiency.tokensPerReq')}
                  </div>
                  <div className="mt-1 font-mono">{formatTokens(model.tokensPerRequest)}</div>
                </div>
                <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                  <div className="text-muted-foreground">Cache %</div>
                  <div className="mt-1 font-mono">{formatPercent(model.cacheShare, 1)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  {t('tables.modelEfficiency.model')}
                </th>
                <SortHeader label={t('tables.modelEfficiency.cost')} field="cost" />
                <SortHeader label={t('tables.modelEfficiency.tokens')} field="tokens" />
                <SortHeader label="$/1M" field="costPerMillion" />
                <SortHeader label={t('tables.modelEfficiency.shareShort')} field="share" />
                <SortHeader label={t('tables.modelEfficiency.req')} field="requests" />
                <SortHeader label={t('tables.modelEfficiency.reqShare')} field="requestShare" />
                <SortHeader label={t('tables.modelEfficiency.costPerReq')} field="costPerRequest" />
                <SortHeader
                  label={t('tables.modelEfficiency.tokensPerReq')}
                  field="tokensPerRequest"
                />
                <SortHeader label={t('tables.modelEfficiency.cacheShare')} field="cacheShare" />
                <SortHeader
                  label={t('tables.modelEfficiency.thinkingShare')}
                  field="thinkingShare"
                />
                <SortHeader
                  label={t('tables.modelEfficiency.avgPerUnit', { unit: periodUnit(viewMode) })}
                  field="costPerDay"
                />
                <SortHeader label={periodLabel(viewMode, true)} field="days" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((model) => (
                <tr
                  key={model.name}
                  className="border-b border-border/50 transition-colors even:bg-muted/5 hover:bg-muted/10"
                >
                  <td className="px-3 py-2.5">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: getModelColor(model.name) }}
                      />
                      <span className="font-medium">{model.name}</span>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium',
                          getProviderBadgeClasses(getModelProvider(model.name)),
                        )}
                      >
                        {getModelProvider(model.name)}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={model.cost} type="currency" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={model.tokens} type="tokens" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={model.costPerMillion} type="currency" />
                  </td>
                  <td className="relative px-3 py-2.5 text-right font-mono tabular-nums">
                    <div
                      className="absolute inset-y-1 left-0 rounded-sm transition-all duration-500"
                      style={{
                        width: `${model.share}%`,
                        backgroundColor: getModelColorAlpha(model.name, 0.16),
                      }}
                    />
                    <span className="relative">{formatPercent(model.share)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatNumber(model.requests)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatPercent(model.requestShare, 1)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={model.costPerRequest} type="currency" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatTokens(model.tokensPerRequest)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatPercent(model.cacheShare, 1)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatPercent(model.thinkingShare, 1)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    <FormattedValue value={model.costPerDay} type="currency" />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{model.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
