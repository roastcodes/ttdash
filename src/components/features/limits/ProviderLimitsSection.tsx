import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useInView } from 'framer-motion'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipValueType,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, CreditCard, ShieldCheck, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/section-header'
import { ChartAnimationAware, ChartCard, ChartReveal } from '@/components/charts/ChartCard'
import { ChartLegend } from '@/components/charts/ChartLegend'
import { CHART_ANIMATION, CHART_COLORS, CHART_MARGIN } from '@/components/charts/chart-theme'
import { buildProviderMonthlyCosts, getLatestMonth } from '@/lib/provider-limits'
import i18n from '@/lib/i18n'
import { CHART_HELP, SECTION_HELP } from '@/lib/help-content'
import {
  coerceNumber,
  formatCurrency,
  formatCurrencyExact,
  formatMonthYear,
} from '@/lib/formatters'
import { getProviderBadgeStyle } from '@/lib/model-utils'
import type { DailyUsage, ProviderLimits } from '@/types'

interface ProviderLimitsSectionProps {
  data: DailyUsage[]
  providers: string[]
  limits: ProviderLimits
  selectedMonth: string | null
}

interface ProviderLimitRow {
  provider: string
  cost: number
  totalCost: number
  monthlyLimit: number
  subscriptionPrice: number
  hasSubscription: boolean
  remaining: number | null
  overrun: number
  utilization: number | null
  subscriptionDelta: number | null
  subscriptionGain: number
  subscriptionGap: number
  riskStatus: 'ok' | 'warning' | 'limit' | 'none'
  subscriptionStatus: 'gain' | 'gap' | 'none'
}

function riskLabel(row: ProviderLimitRow) {
  if (row.riskStatus === 'limit') return i18n.t('limits.statuses.limitExceeded')
  if (row.riskStatus === 'warning') return i18n.t('limits.statuses.budgetTight')
  if (row.riskStatus === 'ok') return i18n.t('limits.statuses.budgetStable')
  return i18n.t('limits.statuses.noLimit')
}

function subscriptionLabel(row: ProviderLimitRow) {
  if (!row.hasSubscription) return i18n.t('limits.statuses.noSubscription')
  if (row.subscriptionStatus === 'gain') return i18n.t('limits.statuses.subscriptionPaysOff')
  return i18n.t('limits.statuses.belowSubscription')
}

function formatLimitBadge(row: ProviderLimitRow, subscriptionProgress: number) {
  if (row.monthlyLimit > 0) {
    return i18n.t('limits.badge.limit', { value: row.utilization?.toFixed(0) ?? '0' })
  }

  if (row.hasSubscription) {
    return i18n.t('limits.badge.subscription', {
      value: Math.min(subscriptionProgress, 999).toFixed(0),
    })
  }

  return i18n.t('limits.badge.open')
}

function toTooltipNumber(value: TooltipValueType | undefined) {
  const numericValue = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

export function ProviderLimitsSection({
  data,
  providers,
  limits,
  selectedMonth,
}: ProviderLimitsSectionProps) {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.2 })

  const {
    rows,
    focusMonth,
    timelineData,
    atLimitCount,
    nearLimitCount,
    subscriptionTotal,
    subscriptionGainTotal,
  } = useMemo(() => {
    const { months, monthMap, providerTotals } = buildProviderMonthlyCosts(data)
    const latestMonth = getLatestMonth(data)
    const resolvedFocusMonth = selectedMonth ?? latestMonth

    const nextRows: ProviderLimitRow[] = providers
      .map((provider) => {
        const config = limits[provider]
        const cost = resolvedFocusMonth ? (monthMap.get(resolvedFocusMonth)?.get(provider) ?? 0) : 0
        const totalCost = providerTotals.get(provider) ?? 0
        const monthlyLimit = config?.monthlyLimit ?? 0
        const hasSubscription = Boolean(config?.hasSubscription)
        const subscriptionPrice = hasSubscription ? (config?.subscriptionPrice ?? 0) : 0
        const overrun = monthlyLimit > 0 ? Math.max(cost - monthlyLimit, 0) : 0
        const remaining = monthlyLimit > 0 ? Math.max(monthlyLimit - cost, 0) : null
        const utilization = monthlyLimit > 0 ? (cost / monthlyLimit) * 100 : null
        const subscriptionDelta = hasSubscription ? cost - subscriptionPrice : null
        const subscriptionGain = subscriptionDelta !== null ? Math.max(subscriptionDelta, 0) : 0
        const subscriptionGap = subscriptionDelta !== null ? Math.max(-subscriptionDelta, 0) : 0

        let riskStatus: ProviderLimitRow['riskStatus'] = 'none'
        if (monthlyLimit > 0 && cost >= monthlyLimit) riskStatus = 'limit'
        else if (monthlyLimit > 0 && cost >= monthlyLimit * 0.8) riskStatus = 'warning'
        else if (monthlyLimit > 0) riskStatus = 'ok'

        const subscriptionStatus: ProviderLimitRow['subscriptionStatus'] = !hasSubscription
          ? 'none'
          : subscriptionGain > 0
            ? 'gain'
            : 'gap'

        return {
          provider,
          cost,
          totalCost,
          monthlyLimit,
          subscriptionPrice,
          hasSubscription,
          remaining,
          overrun,
          utilization,
          subscriptionDelta,
          subscriptionGain,
          subscriptionGap,
          riskStatus,
          subscriptionStatus,
        }
      })
      .sort((a, b) => {
        if (a.riskStatus === 'limit' && b.riskStatus !== 'limit') return -1
        if (a.riskStatus !== 'limit' && b.riskStatus === 'limit') return 1
        if (a.subscriptionStatus === 'gain' && b.subscriptionStatus !== 'gain') return -1
        if (a.subscriptionStatus !== 'gain' && b.subscriptionStatus === 'gain') return 1
        return b.cost - a.cost
      })

    const nextTimeline = months.map((month) => {
      const monthCosts = monthMap.get(month) ?? new Map<string, number>()
      const totalCost = providers.reduce(
        (sum, provider) => sum + (monthCosts.get(provider) ?? 0),
        0,
      )
      const totalLimit = providers.reduce((sum, provider) => {
        const limit = limits[provider]?.monthlyLimit ?? 0
        return sum + (limit > 0 ? limit : 0)
      }, 0)
      const totalSubscriptions = providers.reduce((sum, provider) => {
        const config = limits[provider]
        return sum + (config?.hasSubscription ? config.subscriptionPrice : 0)
      }, 0)
      const totalOverrun = providers.reduce((sum, provider) => {
        const limit = limits[provider]?.monthlyLimit ?? 0
        const cost = monthCosts.get(provider) ?? 0
        return sum + (limit > 0 ? Math.max(cost - limit, 0) : 0)
      }, 0)
      const totalSubscriptionGain = providers.reduce((sum, provider) => {
        const config = limits[provider]
        const cost = monthCosts.get(provider) ?? 0
        const sub = config?.hasSubscription ? config.subscriptionPrice : 0
        return sum + Math.max(cost - sub, 0)
      }, 0)
      const totalSubscriptionGap = providers.reduce((sum, provider) => {
        const config = limits[provider]
        const cost = monthCosts.get(provider) ?? 0
        const sub = config?.hasSubscription ? config.subscriptionPrice : 0
        return sum + (config?.hasSubscription ? Math.max(sub - cost, 0) : 0)
      }, 0)

      return {
        month,
        totalCost,
        totalLimit: totalLimit > 0 ? totalLimit : null,
        totalSubscriptions: totalSubscriptions > 0 ? totalSubscriptions : null,
        totalOverrun,
        totalSubscriptionGain,
        totalSubscriptionGap,
      }
    })

    return {
      rows: nextRows,
      focusMonth: resolvedFocusMonth,
      timelineData: nextTimeline,
      atLimitCount: nextRows.filter((row) => row.riskStatus === 'limit').length,
      nearLimitCount: nextRows.filter((row) => row.riskStatus === 'warning').length,
      subscriptionTotal: nextRows.reduce((sum, row) => sum + row.subscriptionPrice, 0),
      subscriptionGainTotal: nextRows.reduce((sum, row) => sum + row.subscriptionGain, 0),
    }
  }, [data, limits, providers, selectedMonth])

  if (providers.length === 0) return null

  return (
    <div id="limits" ref={sectionRef}>
      <SectionHeader
        title={t('limits.sectionTitle')}
        badge={t('limits.providersBadge', { count: providers.length })}
        description={t('limits.sectionDescription')}
        info={SECTION_HELP.limits}
      />

      {atLimitCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.35 }}
          className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {t('limits.warningBanner', { count: atLimitCount })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          {
            label: t('limits.cards.atLimit'),
            value: String(atLimitCount),
            hint: focusMonth ? formatMonthYear(focusMonth) : t('limits.cards.noMonth'),
            icon: <AlertTriangle className="h-4 w-4" />,
          },
          {
            label: t('limits.cards.nearLimit'),
            value: String(nearLimitCount),
            hint: t('limits.cards.nearLimitHint'),
            icon: <ShieldCheck className="h-4 w-4" />,
          },
          {
            label: t('limits.cards.subscriptionVolume'),
            value: formatCurrency(subscriptionTotal),
            hint: t('limits.cards.subscriptionVolumeHint'),
            icon: <CreditCard className="h-4 w-4" />,
          },
          {
            label: t('limits.cards.subscriptionValue'),
            value: formatCurrency(subscriptionGainTotal),
            hint: t('limits.cards.subscriptionValueHint'),
            icon: <TrendingUp className="h-4 w-4" />,
          },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.35, delay: 0.04 * index }}
          >
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/15 p-2 text-muted-foreground">
                    {item.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {rows.map((row, index) => {
          const providerStyle = getProviderBadgeStyle(row.provider)
          const riskProgress =
            row.monthlyLimit > 0 ? Math.min((row.cost / row.monthlyLimit) * 100, 100) : 0
          const subscriptionProgress =
            row.hasSubscription && row.subscriptionPrice > 0
              ? (row.cost / row.subscriptionPrice) * 100
              : 0
          const subscriptionProgressWidth = Math.min(subscriptionProgress, 100)

          return (
            <motion.div
              key={row.provider}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.35, delay: 0.05 + index * 0.03 }}
            >
              <Card
                className={
                  row.riskStatus === 'limit'
                    ? 'border-red-500/40 bg-red-500/[0.06]'
                    : row.subscriptionStatus === 'gain'
                      ? 'border-emerald-500/30 bg-emerald-500/[0.05]'
                      : undefined
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{row.provider}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{riskLabel(row)}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground/80">
                        {subscriptionLabel(row)}
                      </div>
                    </div>
                    <div
                      className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                      style={providerStyle}
                    >
                      {formatLimitBadge(row, subscriptionProgress)}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {t('limits.tracks.usageFocusMonth')}
                      </div>
                      <div className="mt-1 text-xl font-semibold tabular-nums">
                        {formatCurrency(row.cost)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {t('limits.tracks.limitSubscription')}
                      </div>
                      <div className="mt-1 text-sm font-medium tabular-nums">
                        {row.monthlyLimit > 0
                          ? formatCurrency(row.monthlyLimit)
                          : t('limits.statuses.noLimit')}{' '}
                        / {row.hasSubscription ? formatCurrency(row.subscriptionPrice) : '–'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{t('limits.tracks.budgetRisk')}</span>
                        <span>
                          {row.monthlyLimit > 0
                            ? row.overrun > 0
                              ? `+${formatCurrency(row.overrun)}`
                              : formatCurrency(row.remaining ?? 0)
                            : t('limits.statuses.noLimit')}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted/30">
                        {row.monthlyLimit > 0 ? (
                          <motion.div
                            className={
                              row.riskStatus === 'limit'
                                ? 'h-full bg-red-400'
                                : row.riskStatus === 'warning'
                                  ? 'h-full bg-amber-400'
                                  : 'h-full'
                            }
                            initial={{ width: 0 }}
                            animate={inView ? { width: `${riskProgress}%` } : { width: 0 }}
                            transition={{
                              duration: 0.8,
                              delay: 0.08 + index * 0.04,
                              ease: 'easeOut',
                            }}
                            {...(row.riskStatus === 'limit' || row.riskStatus === 'warning'
                              ? {}
                              : { style: { backgroundColor: providerStyle.color } })}
                          />
                        ) : (
                          <div className="h-full w-full bg-muted/20" />
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{t('limits.tracks.subscriptionEffect')}</span>
                        <span
                          className={
                            row.subscriptionStatus === 'gain'
                              ? 'text-emerald-300'
                              : row.subscriptionStatus === 'gap'
                                ? 'text-amber-200'
                                : ''
                          }
                        >
                          {!row.hasSubscription
                            ? t('limits.statuses.noSubscription')
                            : row.subscriptionStatus === 'gain'
                              ? `+${formatCurrency(row.subscriptionGain)}`
                              : formatCurrency(row.subscriptionGap)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted/30">
                        {row.hasSubscription ? (
                          <motion.div
                            className={
                              row.subscriptionStatus === 'gain'
                                ? 'h-full bg-emerald-400'
                                : 'h-full bg-amber-300'
                            }
                            initial={{ width: 0 }}
                            animate={
                              inView
                                ? { width: `${Math.max(8, subscriptionProgressWidth)}%` }
                                : { width: 0 }
                            }
                            transition={{
                              duration: 0.8,
                              delay: 0.12 + index * 0.04,
                              ease: 'easeOut',
                            }}
                          />
                        ) : (
                          <div className="h-full w-full bg-muted/20" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t('limits.tracks.budgetTitle')}
          subtitle={
            focusMonth ? t('limits.tracks.budgetSubtitle') : t('limits.tracks.budgetNoMonth')
          }
          info={CHART_HELP.providerLimitProgress}
          chartData={rows as unknown as Record<string, unknown>[]}
          valueKey="cost"
          valueFormatter={formatCurrency}
        >
          <div className="space-y-3">
            {rows.map((row, index) => {
              const maxValue =
                row.monthlyLimit > 0
                  ? Math.max(row.monthlyLimit, row.cost, 1)
                  : Math.max(row.cost, 1)
              const scaleMax = maxValue * 1.15
              const costWidth = `${(row.cost / scaleMax) * 100}%`
              const limitPosition =
                row.monthlyLimit > 0 ? `${(row.monthlyLimit / scaleMax) * 100}%` : '0%'
              const withinLimitWidth =
                row.monthlyLimit > 0
                  ? `${(Math.min(row.cost, row.monthlyLimit) / scaleMax) * 100}%`
                  : costWidth
              const overLimitWidth =
                row.monthlyLimit > 0 && row.overrun > 0
                  ? `${(row.overrun / scaleMax) * 100}%`
                  : '0%'

              return (
                <motion.div
                  key={row.provider}
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.35, delay: 0.04 + index * 0.04 }}
                  className="rounded-xl border border-border/50 bg-muted/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{row.provider}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {row.monthlyLimit <= 0
                          ? t('limits.statuses.noLimit')
                          : row.overrun > 0
                            ? t('limits.tracks.alreadyAboveLimit', {
                                value: formatCurrency(row.overrun),
                              })
                            : t('limits.tracks.stillToLimit', {
                                value: formatCurrency(row.remaining ?? 0),
                              })}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-muted-foreground">
                        {t('limits.tracks.usage')} {formatCurrency(row.cost)}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {t('limits.tracks.limit')}{' '}
                        {row.monthlyLimit > 0 ? formatCurrency(row.monthlyLimit) : '–'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="relative h-14">
                      <div className="absolute inset-x-0 top-5 h-4 rounded-full bg-muted/25" />

                      {row.monthlyLimit > 0 ? (
                        <>
                          <div
                            className="absolute left-0 top-5 h-4 rounded-l-full bg-sky-400/12"
                            style={{ width: limitPosition }}
                          />
                          <div
                            className="absolute top-5 h-4 rounded-r-full bg-red-400/12"
                            style={{ left: limitPosition, width: `calc(100% - ${limitPosition})` }}
                          />

                          <motion.div
                            className={
                              row.riskStatus === 'warning'
                                ? 'absolute left-0 top-5 h-4 rounded-full bg-amber-400'
                                : 'absolute left-0 top-5 h-4 rounded-full bg-sky-400'
                            }
                            initial={{ width: 0 }}
                            animate={inView ? { width: withinLimitWidth } : { width: 0 }}
                            transition={{
                              duration: 0.75,
                              delay: 0.08 + index * 0.04,
                              ease: 'easeOut',
                            }}
                          />

                          {row.overrun > 0 && (
                            <motion.div
                              className="absolute top-5 h-4 rounded-r-full bg-red-400"
                              style={{ left: limitPosition }}
                              initial={{ width: 0 }}
                              animate={inView ? { width: overLimitWidth } : { width: 0 }}
                              transition={{
                                duration: 0.75,
                                delay: 0.14 + index * 0.04,
                                ease: 'easeOut',
                              }}
                            />
                          )}

                          <div
                            className="absolute top-2 h-10 w-px bg-border"
                            style={{ left: limitPosition }}
                          />
                          <div
                            className="absolute top-0 -translate-x-1/2 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                            style={{ left: limitPosition }}
                          >
                            {t('limits.tracks.limit')}
                          </div>
                        </>
                      ) : (
                        <motion.div
                          className="absolute left-0 top-5 h-4 rounded-full bg-muted-foreground/40"
                          initial={{ width: 0 }}
                          animate={inView ? { width: costWidth } : { width: 0 }}
                          transition={{
                            duration: 0.75,
                            delay: 0.08 + index * 0.04,
                            ease: 'easeOut',
                          }}
                        />
                      )}

                      <div className="absolute top-11 left-0 text-[10px] text-muted-foreground">
                        $0
                      </div>
                      <div className="absolute top-11 right-0 text-[10px] text-muted-foreground">
                        {formatCurrency(scaleMax)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                    <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                      <div className="text-muted-foreground">
                        {t('limits.tracks.currentlyUsed')}
                      </div>
                      <div className="mt-1 font-medium text-foreground">
                        {formatCurrency(row.cost)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                      <div className="text-muted-foreground">
                        {t('limits.tracks.remainingToLimit')}
                      </div>
                      <div
                        className={
                          row.monthlyLimit > 0 && row.overrun === 0
                            ? 'mt-1 font-medium text-sky-300'
                            : 'mt-1 font-medium text-muted-foreground'
                        }
                      >
                        {row.monthlyLimit > 0
                          ? row.overrun === 0
                            ? formatCurrency(row.remaining ?? 0)
                            : '$0.00'
                          : '–'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                      <div className="text-muted-foreground">
                        {t('limits.tracks.alreadyOverLimit')}
                      </div>
                      <div
                        className={
                          row.overrun > 0
                            ? 'mt-1 font-medium text-red-300'
                            : 'mt-1 font-medium text-muted-foreground'
                        }
                      >
                        {row.monthlyLimit > 0
                          ? row.overrun > 0
                            ? formatCurrency(row.overrun)
                            : '$0.00'
                          : '–'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </ChartCard>

        <ChartCard
          title={t('limits.tracks.subscriptionTitle')}
          subtitle={
            focusMonth
              ? t('limits.tracks.subscriptionSubtitle')
              : t('limits.tracks.subscriptionNoMonth')
          }
          info={CHART_HELP.providerSubscriptionMix}
          chartData={rows as unknown as Record<string, unknown>[]}
          valueKey="cost"
          valueFormatter={formatCurrency}
        >
          <div className="space-y-3">
            {rows.map((row, index) => {
              const maxValue = row.hasSubscription
                ? Math.max(row.subscriptionPrice, row.cost, 1)
                : Math.max(row.cost, 1)
              const scaleMax = maxValue * 1.15
              const costWidth = `${(row.cost / scaleMax) * 100}%`
              const subPosition = row.hasSubscription
                ? `${(row.subscriptionPrice / scaleMax) * 100}%`
                : '0%'
              const withinSubscriptionWidth = row.hasSubscription
                ? `${(Math.min(row.cost, row.subscriptionPrice) / scaleMax) * 100}%`
                : costWidth
              const overSubscriptionWidth =
                row.hasSubscription && row.subscriptionGain > 0
                  ? `${(row.subscriptionGain / scaleMax) * 100}%`
                  : '0%'

              return (
                <motion.div
                  key={row.provider}
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.35, delay: 0.04 + index * 0.04 }}
                  className="rounded-xl border border-border/50 bg-muted/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{row.provider}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {!row.hasSubscription
                          ? t('limits.tracks.noSubscriptionSet')
                          : row.subscriptionStatus === 'gain'
                            ? t('limits.tracks.alreadyAboveBreakEvenText', {
                                value: formatCurrency(row.subscriptionGain),
                              })
                            : t('limits.tracks.stillToBreakEven', {
                                value: formatCurrency(row.subscriptionGap),
                              })}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-muted-foreground">
                        {t('limits.tracks.usage')} {formatCurrency(row.cost)}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {t('limits.tracks.subscription')}{' '}
                        {row.hasSubscription ? formatCurrency(row.subscriptionPrice) : '–'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="relative h-14">
                      <div className="absolute inset-x-0 top-5 h-4 rounded-full bg-muted/25" />

                      {row.hasSubscription ? (
                        <>
                          <div
                            className="absolute left-0 top-5 h-4 rounded-l-full bg-amber-300/18"
                            style={{ width: subPosition }}
                          />
                          <div
                            className="absolute top-5 h-4 rounded-r-full bg-emerald-400/14"
                            style={{ left: subPosition, width: `calc(100% - ${subPosition})` }}
                          />

                          <motion.div
                            className="absolute left-0 top-5 h-4 rounded-full bg-amber-300"
                            initial={{ width: 0 }}
                            animate={inView ? { width: withinSubscriptionWidth } : { width: 0 }}
                            transition={{
                              duration: 0.75,
                              delay: 0.08 + index * 0.04,
                              ease: 'easeOut',
                            }}
                          />

                          {row.subscriptionGain > 0 && (
                            <motion.div
                              className="absolute top-5 h-4 rounded-r-full bg-emerald-400"
                              style={{ left: subPosition }}
                              initial={{ width: 0 }}
                              animate={inView ? { width: overSubscriptionWidth } : { width: 0 }}
                              transition={{
                                duration: 0.75,
                                delay: 0.14 + index * 0.04,
                                ease: 'easeOut',
                              }}
                            />
                          )}

                          <div
                            className="absolute top-2 h-10 w-px bg-border"
                            style={{ left: subPosition }}
                          />
                          <div
                            className="absolute top-0 -translate-x-1/2 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                            style={{ left: subPosition }}
                          >
                            {t('limits.tracks.breakEven')}
                          </div>
                        </>
                      ) : (
                        <motion.div
                          className="absolute left-0 top-5 h-4 rounded-full bg-muted-foreground/40"
                          initial={{ width: 0 }}
                          animate={inView ? { width: costWidth } : { width: 0 }}
                          transition={{
                            duration: 0.75,
                            delay: 0.08 + index * 0.04,
                            ease: 'easeOut',
                          }}
                        />
                      )}

                      <div className="absolute top-11 left-0 text-[10px] text-muted-foreground">
                        $0
                      </div>
                      <div className="absolute top-11 right-0 text-[10px] text-muted-foreground">
                        {formatCurrency(scaleMax)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                    <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                      <div className="text-muted-foreground">
                        {t('limits.tracks.currentlyUsed')}
                      </div>
                      <div className="mt-1 font-medium text-foreground">
                        {formatCurrency(row.cost)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                      <div className="text-muted-foreground">
                        {t('limits.tracks.remainingToBreakEven')}
                      </div>
                      <div
                        className={
                          row.hasSubscription && row.subscriptionGap > 0
                            ? 'mt-1 font-medium text-amber-200'
                            : 'mt-1 font-medium text-muted-foreground'
                        }
                      >
                        {row.hasSubscription
                          ? row.subscriptionGap > 0
                            ? formatCurrency(row.subscriptionGap)
                            : '$0.00'
                          : '–'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                      <div className="text-muted-foreground">
                        {t('limits.tracks.alreadyAboveBreakEven')}
                      </div>
                      <div
                        className={
                          row.subscriptionGain > 0
                            ? 'mt-1 font-medium text-emerald-300'
                            : 'mt-1 font-medium text-muted-foreground'
                        }
                      >
                        {row.hasSubscription
                          ? row.subscriptionGain > 0
                            ? formatCurrency(row.subscriptionGain)
                            : '$0.00'
                          : '–'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard
          title={t('limits.tracks.portfolioTitle')}
          subtitle={t('limits.tracks.portfolioSubtitle')}
          info={CHART_HELP.providerLimitTimeline}
          chartData={timelineData as unknown as Record<string, unknown>[]}
          valueKey="totalCost"
          valueFormatter={formatCurrency}
        >
          <ChartAnimationAware>
            {(animate) => (
              <ChartReveal variant="line" delay={0.06}>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={timelineData} margin={CHART_MARGIN}>
                    <defs>
                      <linearGradient id="limits-risk-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(248 113 113)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="rgb(248 113 113)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="limits-gain-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(74 222 128)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="rgb(74 222 128)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_COLORS.grid}
                      opacity={0.25}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthYear}
                      stroke={CHART_COLORS.axis}
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => {
                        const numericValue = coerceNumber(value)
                        return numericValue === null ? '' : formatCurrency(Math.abs(numericValue))
                      }}
                      stroke={CHART_COLORS.axis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(
                        value: TooltipValueType | undefined,
                        name: string | number | undefined,
                      ) => [formatCurrencyExact(Math.abs(toTooltipNumber(value))), name ?? '']}
                      labelFormatter={(label) => formatMonthYear(String(label))}
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: 'hsl(var(--border))',
                        background: 'color-mix(in srgb, hsl(var(--popover)) 90%, transparent)',
                      }}
                    />
                    <Legend content={<ChartLegend />} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <Area
                      type="monotone"
                      dataKey="totalSubscriptionGain"
                      name={t('limits.cards.subscriptionValue')}
                      stroke="rgb(74 222 128)"
                      fill="url(#limits-gain-area)"
                      strokeWidth={2}
                      isAnimationActive={animate}
                      animationBegin={0}
                      animationDuration={CHART_ANIMATION.duration}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalOverrun"
                      name={t('limits.tracks.alreadyOverLimit')}
                      stroke="rgb(248 113 113)"
                      fill="url(#limits-risk-area)"
                      strokeWidth={2}
                      isAnimationActive={animate}
                      animationBegin={CHART_ANIMATION.stagger * 1.2}
                      animationDuration={CHART_ANIMATION.duration}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalCost"
                      name={`${t('limits.tracks.usage')} ${t('common.costs').toLowerCase()}`}
                      stroke={CHART_COLORS.cost}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={animate}
                      animationBegin={CHART_ANIMATION.stagger * 1.6}
                      animationDuration={CHART_ANIMATION.slowDuration}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalLimit"
                      name={t('limits.tracks.limits')}
                      stroke="rgb(251 146 60)"
                      strokeDasharray="6 3"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={animate}
                      animationBegin={CHART_ANIMATION.stagger * 2}
                      animationDuration={CHART_ANIMATION.slowDuration}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalSubscriptions"
                      name={t('limits.tracks.subscriptions')}
                      stroke="rgb(125 211 252)"
                      strokeDasharray="3 3"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                      isAnimationActive={animate}
                      animationBegin={CHART_ANIMATION.stagger * 2.3}
                      animationDuration={CHART_ANIMATION.slowDuration}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartReveal>
            )}
          </ChartAnimationAware>
        </ChartCard>
      </div>
    </div>
  )
}
