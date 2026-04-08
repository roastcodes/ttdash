import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, ChartBar, LineChart } from 'lucide-react'
import { getKeyboardShortcuts, METRIC_HELP, CHART_HELP, SECTION_HELP, FEATURE_HELP } from '@/lib/help-content'

interface HelpPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpPanel({ open, onOpenChange }: HelpPanelProps) {
  const { t } = useTranslation()
  const shortcuts = getKeyboardShortcuts()
  const metricLabels = useMemo<Record<string, string>>(() => ({
    totalCost: t('helpPanel.metricLabels.totalCost'),
    totalTokens: t('helpPanel.metricLabels.totalTokens'),
    activeDays: t('helpPanel.metricLabels.activeDays'),
    topModel: t('helpPanel.metricLabels.topModel'),
    cacheHitRate: t('helpPanel.metricLabels.cacheHitRate'),
    costPerMillion: t('helpPanel.metricLabels.costPerMillion'),
    mostExpensiveDay: t('helpPanel.metricLabels.mostExpensiveDay'),
    cheapestDay: t('helpPanel.metricLabels.cheapestDay'),
    avgCostPerDay: t('helpPanel.metricLabels.avgCostPerDay'),
    outputTokens: t('helpPanel.metricLabels.outputTokens'),
  }), [t])
  const chartLabels = useMemo<Record<string, string>>(() => ({
    costOverTime: t('helpPanel.chartLabels.costOverTime'),
    costByModel: t('helpPanel.chartLabels.costByModel'),
    costByModelOverTime: t('helpPanel.chartLabels.costByModelOverTime'),
    cumulativeCost: t('helpPanel.chartLabels.cumulativeCost'),
    costByWeekday: t('helpPanel.chartLabels.costByWeekday'),
    tokensOverTime: t('helpPanel.chartLabels.tokensOverTime'),
    requestsOverTime: t('helpPanel.chartLabels.requestsOverTime'),
    requestCacheHitRate: t('helpPanel.chartLabels.requestCacheHitRate'),
    tokenTypes: t('helpPanel.chartLabels.tokenTypes'),
    tokenEfficiency: t('helpPanel.chartLabels.tokenEfficiency'),
    modelMix: t('helpPanel.chartLabels.modelMix'),
    distributionAnalysis: t('helpPanel.chartLabels.distributionAnalysis'),
    correlationAnalysis: t('helpPanel.chartLabels.correlationAnalysis'),
    heatmap: t('helpPanel.chartLabels.heatmap'),
    requestHeatmap: t('helpPanel.chartLabels.requestHeatmap'),
    tokenHeatmap: t('helpPanel.chartLabels.tokenHeatmap'),
    forecast: t('helpPanel.chartLabels.forecast'),
    cacheROI: t('helpPanel.chartLabels.cacheROI'),
    periodComparison: t('helpPanel.chartLabels.periodComparison'),
    anomalyDetection: t('helpPanel.chartLabels.anomalyDetection'),
  }), [t])
  const sectionLabels = useMemo<Record<string, string>>(() => ({
    insights: t('helpPanel.sectionLabels.insights'),
    metrics: t('helpPanel.sectionLabels.metrics'),
    today: t('helpPanel.sectionLabels.today'),
    currentMonth: t('helpPanel.sectionLabels.currentMonth'),
    activity: t('helpPanel.sectionLabels.activity'),
    forecastCache: t('helpPanel.sectionLabels.forecastCache'),
    costAnalysis: t('helpPanel.sectionLabels.costAnalysis'),
    tokenAnalysis: t('helpPanel.sectionLabels.tokenAnalysis'),
    requestAnalysis: t('helpPanel.sectionLabels.requestAnalysis'),
    advancedAnalysis: t('helpPanel.sectionLabels.advancedAnalysis'),
    comparisons: t('helpPanel.sectionLabels.comparisons'),
    tables: t('helpPanel.sectionLabels.tables'),
    limits: t('helpPanel.sectionLabels.limits'),
  }), [t])
  const featureLabels = useMemo<Record<string, string>>(() => ({
    requestQuality: t('helpPanel.featureLabels.requestQuality'),
    providerLimits: t('helpPanel.featureLabels.providerLimits'),
    concentrationRisk: t('helpPanel.featureLabels.concentrationRisk'),
    providerEfficiency: t('helpPanel.featureLabels.providerEfficiency'),
    modelEfficiency: t('helpPanel.featureLabels.modelEfficiency'),
    recentDays: t('helpPanel.featureLabels.recentDays'),
  }), [t])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{t('header.help')}</DialogTitle>
          <DialogDescription>
            {t('commandPalette.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Keyboard shortcuts */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Keyboard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t('header.help')}</h3>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.keys}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
              >
                <span className="text-sm text-foreground">{shortcut.description}</span>
                <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border" />

        {/* Metric explanations */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ChartBar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t('dashboard.metrics.title')}</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(METRIC_HELP).map(([key, description]) => (
              <div key={key} className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{metricLabels[key] ?? key}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border" />

        {/* Chart explanations */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <LineChart className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t('helpPanel.chartsAndFeatures')}</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(CHART_HELP).map(([key, description]) => (
              <div key={key} className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{chartLabels[key] ?? key}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-border" />

        <section>
          <div className="flex items-center gap-2 mb-3">
            <ChartBar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t('dashboard.tables.title')}</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(SECTION_HELP).map(([key, description]) => (
              <div key={key} className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{sectionLabels[key] ?? key}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            ))}
            {Object.entries(FEATURE_HELP).map(([key, description]) => (
              <div key={key} className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{featureLabels[key] ?? key}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  )
}
