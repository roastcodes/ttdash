import { Upload, ChartBar, Zap, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FadeIn } from '@/components/features/animations/FadeIn'
import { VERSION } from '@/lib/constants'

interface EmptyStateProps {
  onUpload: () => void
  onAutoImport: () => void
  onOpenSettings: () => void
}

export function EmptyState({ onUpload, onAutoImport, onOpenSettings }: EmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <FadeIn delay={0} duration={0.45}>
        <Card className="p-10 max-w-md w-full text-center space-y-6 border-primary/20 shadow-xl shadow-primary/5">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ChartBar className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-primary">TT</span>Dash
            </h1>
            <p className="text-xs text-muted-foreground font-mono">v{VERSION}</p>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('emptyState.description')}
          </p>
          <Button onClick={onAutoImport} size="lg" className="gap-2 w-full">
            <Zap className="h-4 w-4" />
            {t('emptyState.autoImport')}
          </Button>
          <p className="text-muted-foreground text-xs">{t('emptyState.or')}</p>
          <Button onClick={onUpload} variant="outline" size="lg" className="gap-2 w-full">
            <Upload className="h-4 w-4" />
            {t('emptyState.uploadFile')}
          </Button>
          <Button onClick={onOpenSettings} variant="ghost" size="lg" className="gap-2 w-full">
            <SlidersHorizontal className="h-4 w-4" />
            {t('emptyState.openSettings')}
          </Button>
        </Card>
      </FadeIn>
    </div>
  )
}
