import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Keyboard, BarChart3, LineChart } from 'lucide-react'
import { KEYBOARD_SHORTCUTS, METRIC_HELP, CHART_HELP } from '@/lib/help-content'

interface HelpPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const metricLabels: Record<string, string> = {
  totalCost: 'Gesamtkosten',
  totalTokens: 'Tokens gesamt',
  activeDays: 'Aktive Tage',
  topModel: 'Top-Modell',
  cacheHitRate: 'Cache-Hit-Rate',
  costPerMillion: 'Kosten / 1M Tokens',
  mostExpensiveDay: 'Teuerster Tag',
  cheapestDay: 'Günstigster Tag',
  avgCostPerDay: 'Ø Kosten / Tag',
  outputTokens: 'Output-Tokens',
}

const chartLabels: Record<string, string> = {
  costOverTime: 'Kosten über Zeit',
  costByModel: 'Kosten nach Modell',
  costByModelOverTime: 'Kosten/Modell über Zeit',
  cumulativeCost: 'Kumulative Kosten',
  costByWeekday: 'Kosten nach Wochentag',
  tokensOverTime: 'Tokens über Zeit',
  tokenTypes: 'Token-Typen',
  heatmap: 'Heatmap',
  forecast: 'Prognose',
  cacheROI: 'Cache-ROI',
  periodComparison: 'Periodenvergleich',
  anomalyDetection: 'Anomalie-Erkennung',
}

export function HelpPanel({ open, onOpenChange }: HelpPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Hilfe & Tastenkürzel</DialogTitle>
        </DialogHeader>

        {/* Keyboard shortcuts */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Keyboard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Tastenkürzel</h3>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
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
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Metriken</h3>
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
            <h3 className="text-sm font-semibold">Charts & Features</h3>
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
      </DialogContent>
    </Dialog>
  )
}
