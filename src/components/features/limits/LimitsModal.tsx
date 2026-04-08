import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InfoButton } from '@/components/features/help/InfoButton'
import { FEATURE_HELP } from '@/lib/help-content'
import { formatDateTimeFull } from '@/lib/formatters'
import { getProviderBadgeClasses } from '@/lib/model-utils'
import { syncProviderLimits } from '@/lib/provider-limits'
import { cn } from '@/lib/cn'
import type { DataLoadSource, ProviderLimits } from '@/types'

interface LimitsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: string[]
  limits: ProviderLimits
  lastLoadedAt?: string | null
  lastLoadSource?: DataLoadSource
  cliAutoLoadActive?: boolean
  onSave: (limits: ProviderLimits) => void
}

function parseNumberInput(value: string): number {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return 0
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Number(parsed.toFixed(2)))
}

export function LimitsModal({ open, onOpenChange, providers, limits, lastLoadedAt, lastLoadSource, cliAutoLoadActive = false, onSave }: LimitsModalProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<ProviderLimits>(() => syncProviderLimits(providers, limits))

  useEffect(() => {
    if (!open) return
    setDraft(syncProviderLimits(providers, limits))
  }, [open, providers, limits])

  const updateProvider = (provider: string, patch: Partial<ProviderLimits[string]>) => {
    setDraft(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        ...patch,
      },
    }))
  }

  const handleSave = () => {
    onSave(syncProviderLimits(providers, draft))
    onOpenChange(false)
  }

  const loadSourceLabel = lastLoadSource
    ? t(`limits.modal.sources.${lastLoadSource}`)
    : t('limits.modal.sources.unknown')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto overflow-x-visible">
        <DialogHeader className="overflow-visible">
          <DialogTitle className="flex items-center gap-2">
            {t('limits.modal.title')}
            <InfoButton text={FEATURE_HELP.providerLimits} />
          </DialogTitle>
          <DialogDescription>
            {t('limits.modal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t('limits.modal.dataStatus')}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t('limits.modal.lastLoaded')}</div>
              <div className="text-sm font-medium text-foreground">
                {lastLoadedAt ? formatDateTimeFull(lastLoadedAt) : t('common.notAvailable')}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t('limits.modal.loadedVia')}</div>
              <div className="text-sm font-medium text-foreground">{loadSourceLabel}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t('limits.modal.cliAutoLoad')}</div>
              <div className="text-sm font-medium text-foreground">
                {cliAutoLoadActive ? t('common.enabled') : t('common.disabled')}
              </div>
            </div>
          </div>
        </div>

        {providers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-sm text-muted-foreground text-center">
            {t('limits.modal.noProviders')}
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => {
              const config = draft[provider]

              return (
                <div key={provider} className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', getProviderBadgeClasses(provider))}>
                          {provider}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateProvider(provider, { hasSubscription: !config.hasSubscription })}
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                            config.hasSubscription
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-border bg-muted/20 text-muted-foreground hover:bg-accent'
                          )}
                        >
                          {config.hasSubscription ? t('common.enabled') : t('limits.statuses.noSubscription')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[420px]">
                      <label className="space-y-1.5">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('limits.modal.subscriptionPerMonth')}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={config.subscriptionPrice}
                          disabled={!config.hasSubscription}
                          onChange={(e) => updateProvider(provider, { subscriptionPrice: parseNumberInput(e.target.value) })}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </label>

                      <label className="space-y-1.5">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('limits.modal.monthlyLimit')}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={config.monthlyLimit}
                          onChange={(e) => updateProvider(provider, { monthlyLimit: parseNumberInput(e.target.value) })}
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
          <Button
            variant="ghost"
            onClick={() => setDraft(syncProviderLimits(providers, {}))}
          >
            {t('common.reset')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('limits.modal.close')}</Button>
            <Button onClick={handleSave}>{t('limits.modal.save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
