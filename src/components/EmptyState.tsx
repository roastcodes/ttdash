import { Upload, ChartBar, Zap, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/ui/fade-in'
import { VERSION } from '@/lib/constants'
import { TOKTRACK_PACKAGE_SPEC } from '@/lib/toktrack-version'

interface EmptyStateProps {
  onUpload: () => void
  onAutoImport: () => void
  onOpenSettings: () => void
}

/** Renders the onboarding state shown when no usage data is loaded. */
export function EmptyState({ onUpload, onAutoImport, onOpenSettings }: EmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <FadeIn delay={0} duration={0.45}>
        <Card className="w-full max-w-md space-y-6 border-primary/20 p-10 text-center shadow-xl shadow-primary/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ChartBar className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-primary">TT</span>Dash
            </h1>
            <p className="font-mono text-xs text-muted-foreground">v{VERSION}</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('emptyState.description', { toktrackSpec: TOKTRACK_PACKAGE_SPEC })}
          </p>
          <Button onClick={onAutoImport} size="lg" className="w-full gap-2">
            <Zap className="h-4 w-4" />
            {t('emptyState.autoImport')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('emptyState.or')}</p>
          <Button onClick={onUpload} variant="outline" size="lg" className="w-full gap-2">
            <Upload className="h-4 w-4" />
            {t('emptyState.uploadFile')}
          </Button>
          <Button onClick={onOpenSettings} variant="ghost" size="lg" className="w-full gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {t('emptyState.openSettings')}
          </Button>
        </Card>
      </FadeIn>
    </div>
  )
}
