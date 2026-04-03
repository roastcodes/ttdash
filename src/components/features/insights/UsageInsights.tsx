import type { ReactNode } from 'react'
import { Activity, Building2, Layers3, Sparkles, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/section-header'
import { FadeIn } from '@/components/features/animations/FadeIn'
import { FormattedValue } from '@/components/ui/formatted-value'
import { formatCurrency, formatDate, formatNumber, formatPercent, formatTokens, periodUnit } from '@/lib/formatters'
import type { DashboardMetrics, ViewMode } from '@/types'

interface UsageInsightsProps {
  metrics: DashboardMetrics
  viewMode: ViewMode
  totalCalendarDays?: number
}

interface InsightCardProps {
  title: string
  icon: ReactNode
  value: ReactNode
  summary: string
  details: { label: string; value: ReactNode }[]
}

function InsightCard({ title, icon, value, summary, details }: InsightCardProps) {
  return (
    <Card className="overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-2.5 text-muted-foreground">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {details.map((detail) => (
          <div key={detail.label} className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{detail.label}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{detail.value}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function UsageInsights({ metrics, viewMode, totalCalendarDays }: UsageInsightsProps) {
  const coverageRate = totalCalendarDays && viewMode === 'daily'
    ? (metrics.activeDays / totalCalendarDays) * 100
    : null

  return (
    <div>
      <SectionHeader
        title="Insights"
        badge="Verdichtete Signale"
        description="Konzentrierte Aussagen aus Kosten-, Modell- und Request-Daten"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <FadeIn delay={0.03}>
          <InsightCard
            title="Kostenkonzentration"
            icon={<Building2 className="h-5 w-5" />}
            value={metrics.topProvider ? formatPercent(metrics.topProvider.share, 0) : '–'}
            summary={metrics.topProvider
              ? `${metrics.topProvider.name} ist aktuell der dominante Anbieter im gewählten Ausschnitt, während ${metrics.topModel?.name ?? 'das Top-Modell'} den größten Einzelhebel setzt.`
              : 'Noch keine stabile Anbieter-Verteilung verfügbar.'}
            details={[
              { label: 'Top Anbieter', value: metrics.topProvider?.name ?? '–' },
              { label: 'Top Modell', value: metrics.topModel?.name ?? '–' },
              { label: 'Top Modell Anteil', value: formatPercent(metrics.topModelShare, 0) },
              { label: 'Top 3 Modelle', value: formatPercent(metrics.topThreeModelsShare, 0) },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.08}>
          <InsightCard
            title="Request-Ökonomie"
            icon={<Activity className="h-5 w-5" />}
            value={metrics.hasRequestData ? <FormattedValue value={metrics.avgCostPerRequest} type="currency" label="Ø Kosten pro Request" insight={`${formatTokens(metrics.avgTokensPerRequest)} Tokens pro Request im Mittel`} /> : 'n/v'}
            summary={metrics.hasRequestData
              ? `Jede Anfrage kostet im Mittel ${formatCurrency(metrics.avgCostPerRequest)} und verarbeitet ${formatTokens(metrics.avgTokensPerRequest)}. ${metrics.topRequestModel ? `${metrics.topRequestModel.name} führt aktuell beim Request-Volumen.` : ''}`
              : 'Der geladene Datensatz enthält keine verlässlichen Request-Zähler. Request-Ökonomie ist deshalb nicht verfügbar.'}
            details={[
              { label: `Ø Req/${periodUnit(viewMode)}`, value: metrics.hasRequestData ? metrics.avgRequestsPerDay.toFixed(1) : 'n/v' },
              { label: 'Ø Tokens/Req', value: metrics.hasRequestData ? formatTokens(metrics.avgTokensPerRequest) : 'n/v' },
              { label: '$/1M Tokens', value: formatCurrency(metrics.costPerMillion) },
              { label: 'Gesamt Requests', value: metrics.hasRequestData ? formatNumber(metrics.totalRequests) : 'n/v' },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.13}>
          <InsightCard
            title="Nutzungsmuster"
            icon={<Layers3 className="h-5 w-5" />}
            value={coverageRate !== null ? formatPercent(coverageRate, 0) : formatNumber(metrics.activeDays)}
            summary={coverageRate !== null
              ? `${metrics.activeDays} von ${totalCalendarDays} Kalendertagen enthalten Aktivität im gefilterten Zeitraum. Die Requests schwanken dabei um ${formatNumber(Math.round(metrics.requestVolatility))}.`
              : `${metrics.activeDays} aktive ${viewMode === 'yearly' ? 'Jahre' : viewMode === 'monthly' ? 'Monate' : 'Tage'} im gewählten Ausschnitt.`}
            details={[
              { label: 'Ø Modelle/Eintrag', value: metrics.avgModelsPerDay.toFixed(1) },
              { label: 'Anbieter aktiv', value: formatNumber(metrics.providerCount) },
              { label: 'Wochenend-Anteil', value: metrics.weekendCostShare !== null ? formatPercent(metrics.weekendCostShare, 0) : '–' },
              { label: 'Thinking Anteil', value: metrics.totalTokens > 0 ? formatPercent((metrics.totalThinking / metrics.totalTokens) * 100, 1) : '–' },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.18}>
          <InsightCard
            title="Peak-Fenster"
            icon={<TrendingUp className="h-5 w-5" />}
            value={metrics.busiestWeek ? formatCurrency(metrics.busiestWeek.cost) : formatCurrency(metrics.topDay?.cost ?? 0)}
            summary={metrics.busiestWeek
              ? `Stärkste 7-Tage-Phase von ${formatDate(metrics.busiestWeek.start)} bis ${formatDate(metrics.busiestWeek.end)}.`
              : 'Kein 7-Tage-Fenster verfügbar, daher Fokus auf den teuersten Einzelwert.'}
            details={[
              { label: 'Peak Tag', value: metrics.topDay ? `${formatDate(metrics.topDay.date)} · ${formatCurrency(metrics.topDay.cost)}` : '–' },
              { label: `Ø/${periodUnit(viewMode)}`, value: formatCurrency(metrics.avgDailyCost) },
              { label: 'Peak 7T Ø/Tag', value: metrics.busiestWeek ? formatCurrency(metrics.busiestWeek.cost / 7) : '–' },
              { label: 'Signal', value: metrics.topThreeModelsShare >= 80 ? 'stark konzentriert' : metrics.topThreeModelsShare >= 55 ? 'moderat konzentriert' : 'breit verteilt' },
            ]}
          />
        </FadeIn>
      </div>

      <FadeIn delay={0.22}>
        <div className="mt-4 rounded-2xl border border-border/60 bg-gradient-to-r from-primary/[0.08] via-transparent to-chart-3/[0.08] px-4 py-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2 text-foreground font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Quick Read
          </span>
          <span className="ml-2">
            {metrics.topProvider
              ? `${metrics.topProvider.name} trägt ${formatPercent(metrics.topProvider.share, 0)} der Kosten, während die Top-3-Modelle ${formatPercent(metrics.topThreeModelsShare, 0)} bündeln. ${metrics.topRequestModel ? `${metrics.topRequestModel.name} führt bei den Requests, ${metrics.topTokenModel?.name ?? 'das Top-Modell'} beim Tokenvolumen.` : ''}`
              : 'Für den aktuellen Filterausschnitt sind noch nicht genug Daten für eine stabile Zusammenfassung vorhanden.'}
          </span>
        </div>
      </FadeIn>
    </div>
  )
}
