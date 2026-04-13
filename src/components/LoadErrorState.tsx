import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/features/animations/FadeIn'

interface LoadErrorAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'ghost'
}

interface LoadErrorStateProps {
  title: string
  description: string
  details: string[]
  detailLabel: string
  actions: LoadErrorAction[]
}

export function LoadErrorState({
  title,
  description,
  details,
  detailLabel,
  actions,
}: LoadErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <FadeIn delay={0} duration={0.45}>
        <Card className="p-8 max-w-xl w-full space-y-6 border-destructive/20 shadow-xl shadow-destructive/5">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>

          {details.length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {detailLabel}
              </div>
              <ul className="mt-3 space-y-2 text-sm text-foreground">
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {actions.map((action, index) => (
              <Button
                key={`${action.label}-${index}`}
                onClick={action.onClick}
                variant={action.variant ?? 'outline'}
                className="gap-2"
              >
                {index === 0 ? <RefreshCw className="h-4 w-4" /> : null}
                {action.label}
              </Button>
            ))}
          </div>
        </Card>
      </FadeIn>
    </div>
  )
}
