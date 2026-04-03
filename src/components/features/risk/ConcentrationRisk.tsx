import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoButton } from '@/components/features/help/InfoButton'
import { FEATURE_HELP } from '@/lib/help-content'
import { formatPercent } from '@/lib/formatters'

interface ConcentrationRiskProps {
  topModelShare: number
  topProviderShare: number
  modelConcentrationIndex: number
  providerConcentrationIndex: number
}

function describeRisk(value: number) {
  if (value >= 0.6) return { label: 'hoch', tone: 'text-red-400 bg-red-400/10 border-red-400/20' }
  if (value >= 0.35) return { label: 'mittel', tone: 'text-amber-300 bg-amber-400/10 border-amber-400/20' }
  return { label: 'niedrig', tone: 'text-green-400 bg-green-400/10 border-green-400/20' }
}

export function ConcentrationRisk({ topModelShare, topProviderShare, modelConcentrationIndex, providerConcentrationIndex }: ConcentrationRiskProps) {
  const modelRisk = describeRisk(modelConcentrationIndex)
  const providerRisk = describeRisk(providerConcentrationIndex)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Konzentrationsrisiko
          <InfoButton text={FEATURE_HELP.concentrationRisk} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Modell-Abhängigkeit</div>
                <div className="mt-1 text-lg font-semibold">{formatPercent(topModelShare, 1)}</div>
              </div>
              <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${modelRisk.tone}`}>{modelRisk.label}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(topModelShare, 100)}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">HHI {modelConcentrationIndex.toFixed(2)} · Hohe Werte sprechen für wenige dominante Modelle.</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Provider-Abhängigkeit</div>
                <div className="mt-1 text-lg font-semibold">{formatPercent(topProviderShare, 1)}</div>
              </div>
              <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${providerRisk.tone}`}>{providerRisk.label}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full rounded-full bg-chart-3" style={{ width: `${Math.min(topProviderShare, 100)}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">HHI {providerConcentrationIndex.toFixed(2)} · Zeigt die Abhängigkeit von einzelnen Anbietern.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
