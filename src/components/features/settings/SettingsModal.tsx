import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InfoButton } from '@/components/features/help/InfoButton'
import { FEATURE_HELP } from '@/lib/help-content'
import { formatDateTimeFull } from '@/lib/formatters'
import { getProviderBadgeClasses } from '@/lib/model-utils'
import { syncProviderLimits } from '@/lib/provider-limits'
import {
  DASHBOARD_SECTION_DEFINITION_MAP,
  DASHBOARD_DATE_PRESETS,
  DASHBOARD_VIEW_MODES,
  DEFAULT_DASHBOARD_FILTERS,
  getDefaultDashboardSectionOrder,
  getDefaultDashboardSectionVisibility,
} from '@/lib/dashboard-preferences'
import { cn } from '@/lib/cn'
import { ArrowDown, ArrowUp, Database, Download, Eye, Filter, GripVertical, LayoutPanelTop, Settings2, Upload } from 'lucide-react'
import type {
  DashboardDefaultFilters,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  DataLoadSource,
  ProviderLimits,
  ViewMode,
} from '@/types'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  limitProviders: string[]
  filterProviders: string[]
  models: string[]
  limits: ProviderLimits
  defaultFilters: DashboardDefaultFilters
  sectionVisibility: DashboardSectionVisibility
  sectionOrder: DashboardSectionOrder
  lastLoadedAt?: string | null
  lastLoadSource?: DataLoadSource
  cliAutoLoadActive?: boolean
  hasData: boolean
  onSaveSettings: (settings: {
    providerLimits: ProviderLimits
    defaultFilters: DashboardDefaultFilters
    sectionVisibility: DashboardSectionVisibility
    sectionOrder: DashboardSectionOrder
  }) => Promise<unknown> | unknown
  onExportSettings: () => void
  onImportSettings: () => void
  onExportData: () => void
  onImportData: () => void
  settingsBusy?: boolean
  dataBusy?: boolean
}

function parseNumberInput(value: string): number {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return 0
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Number(parsed.toFixed(2)))
}

function toggleSelection(values: string[], value: string) {
  return values.includes(value)
    ? values.filter(entry => entry !== value)
    : [...values, value]
}

function normalizeSelection(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right))
}

function moveSection(order: DashboardSectionOrder, sectionId: DashboardSectionOrder[number], direction: -1 | 1) {
  const currentIndex = order.indexOf(sectionId)
  const targetIndex = currentIndex + direction

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) {
    return order
  }

  const next = [...order]
  const [moved] = next.splice(currentIndex, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

function reorderSections(order: DashboardSectionOrder, sourceId: DashboardSectionOrder[number], targetId: DashboardSectionOrder[number]) {
  if (sourceId === targetId) return order

  const sourceIndex = order.indexOf(sourceId)
  const targetIndex = order.indexOf(targetId)

  if (sourceIndex < 0 || targetIndex < 0) {
    return order
  }

  const next = [...order]
  const [moved] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

export function SettingsModal({
  open,
  onOpenChange,
  limitProviders,
  filterProviders,
  models,
  limits,
  defaultFilters,
  sectionVisibility,
  sectionOrder,
  lastLoadedAt,
  lastLoadSource,
  cliAutoLoadActive = false,
  hasData,
  onSaveSettings,
  onExportSettings,
  onImportSettings,
  onExportData,
  onImportData,
  settingsBusy = false,
  dataBusy = false,
}: SettingsModalProps) {
  const { t } = useTranslation()
  const [limitDraft, setLimitDraft] = useState<ProviderLimits>(() => syncProviderLimits(limitProviders, limits))
  const [defaultFilterDraft, setDefaultFilterDraft] = useState<DashboardDefaultFilters>(defaultFilters)
  const [sectionVisibilityDraft, setSectionVisibilityDraft] = useState<DashboardSectionVisibility>(sectionVisibility)
  const [sectionOrderDraft, setSectionOrderDraft] = useState<DashboardSectionOrder>(sectionOrder)
  const [draggedSectionId, setDraggedSectionId] = useState<DashboardSectionOrder[number] | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<DashboardSectionOrder[number] | null>(null)

  useEffect(() => {
    if (!open) return

    setLimitDraft(syncProviderLimits(limitProviders, limits))
    setDefaultFilterDraft(defaultFilters)
    setSectionVisibilityDraft(sectionVisibility)
    setSectionOrderDraft(sectionOrder)
    setDraggedSectionId(null)
    setDragOverSectionId(null)
  }, [open, limitProviders, limits, defaultFilters, sectionVisibility, sectionOrder])

  const providerOptions = useMemo(
    () => normalizeSelection([...filterProviders, ...defaultFilterDraft.providers]),
    [filterProviders, defaultFilterDraft.providers],
  )
  const modelOptions = useMemo(
    () => normalizeSelection([...models, ...defaultFilterDraft.models]),
    [models, defaultFilterDraft.models],
  )

  const updateProvider = (provider: string, patch: Partial<ProviderLimits[string]>) => {
    setLimitDraft(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        ...patch,
      },
    }))
  }

  const handleSave = async () => {
    const nextProviderLimits = { ...limits }
    for (const provider of limitProviders) {
      nextProviderLimits[provider] = limitDraft[provider]
    }

    await onSaveSettings({
      providerLimits: nextProviderLimits,
      defaultFilters: {
        ...defaultFilterDraft,
        providers: normalizeSelection(defaultFilterDraft.providers),
        models: normalizeSelection(defaultFilterDraft.models),
      },
      sectionVisibility: sectionVisibilityDraft,
      sectionOrder: sectionOrderDraft,
    })
    onOpenChange(false)
  }

  const handleResetDrafts = () => {
    setLimitDraft(syncProviderLimits(limitProviders, {}))
    setDefaultFilterDraft(DEFAULT_DASHBOARD_FILTERS)
    setSectionVisibilityDraft(getDefaultDashboardSectionVisibility())
    setSectionOrderDraft(getDefaultDashboardSectionOrder())
    setDraggedSectionId(null)
    setDragOverSectionId(null)
  }

  const handleResetDefaultFilters = () => {
    setDefaultFilterDraft(DEFAULT_DASHBOARD_FILTERS)
  }

  const handleResetSectionVisibility = () => {
    setSectionVisibilityDraft(getDefaultDashboardSectionVisibility())
    setSectionOrderDraft(getDefaultDashboardSectionOrder())
  }

  const handleResetProviderLimits = () => {
    setLimitDraft(syncProviderLimits(limitProviders, {}))
  }

  const loadSourceLabel = lastLoadSource
    ? t(`settings.modal.sources.${lastLoadSource}`)
    : t('settings.modal.sources.unknown')
  const orderedSections = useMemo(
    () => sectionOrderDraft.map((sectionId) => DASHBOARD_SECTION_DEFINITION_MAP[sectionId]),
    [sectionOrderDraft],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto overflow-x-visible">
        <DialogHeader className="overflow-visible">
          <DialogTitle className="flex items-center gap-2">
            {t('settings.modal.title')}
            <InfoButton text={FEATURE_HELP.providerLimits} />
          </DialogTitle>
          <DialogDescription>
            {t('settings.modal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t('settings.modal.dataStatus')}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t('settings.modal.lastLoaded')}</div>
              <div className="text-sm font-medium text-foreground">
                {lastLoadedAt ? formatDateTimeFull(lastLoadedAt) : t('common.notAvailable')}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t('settings.modal.loadedVia')}</div>
              <div className="text-sm font-medium text-foreground">{loadSourceLabel}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t('settings.modal.cliAutoLoad')}</div>
              <div className="text-sm font-medium text-foreground">
                {cliAutoLoadActive ? t('common.enabled') : t('common.disabled')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
                  <Filter className="h-4 w-4" />
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-medium text-foreground">{t('settings.modal.defaultFiltersTitle')}</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t('settings.modal.defaultFiltersDescription')}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="reset-default-filters"
                onClick={handleResetDefaultFilters}
                disabled={settingsBusy}
              >
                {t('common.reset')}
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('settings.modal.defaultViewMode')}</div>
                <div className="flex flex-wrap gap-2">
                  {DASHBOARD_VIEW_MODES.map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      aria-pressed={defaultFilterDraft.viewMode === mode}
                      variant={defaultFilterDraft.viewMode === mode ? 'default' : 'outline'}
                      onClick={() => setDefaultFilterDraft(prev => ({ ...prev, viewMode: mode as ViewMode }))}
                    >
                      {t(`settings.modal.viewModes.${mode}`)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('settings.modal.defaultDateRange')}</div>
                <div className="flex flex-wrap gap-2">
                  {DASHBOARD_DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      aria-pressed={defaultFilterDraft.datePreset === preset}
                      variant={defaultFilterDraft.datePreset === preset ? 'default' : 'outline'}
                      onClick={() => setDefaultFilterDraft(prev => ({ ...prev, datePreset: preset }))}
                    >
                      {t(`settings.modal.datePresets.${preset}`)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('settings.modal.filterProviders')}</div>
                {providerOptions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
                    {t('settings.modal.noProviders')}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {providerOptions.map((provider) => {
                      const selected = defaultFilterDraft.providers.includes(provider)
                      return (
                        <button
                          key={provider}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setDefaultFilterDraft(prev => ({ ...prev, providers: toggleSelection(prev.providers, provider) }))}
                          className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                            selected
                              ? 'border-primary/30 bg-primary text-primary-foreground'
                              : getProviderBadgeClasses(provider)
                          )}
                        >
                          {provider}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{t('settings.modal.filterModels')}</div>
                {modelOptions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
                    {t('settings.modal.noModels')}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {modelOptions.map((model) => {
                      const selected = defaultFilterDraft.models.includes(model)
                      return (
                        <button
                          key={model}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setDefaultFilterDraft(prev => ({ ...prev, models: toggleSelection(prev.models, model) }))}
                          className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                            selected
                              ? 'border-primary/30 bg-primary text-primary-foreground'
                              : 'border-border bg-muted/20 text-muted-foreground hover:bg-accent hover:text-foreground'
                          )}
                        >
                          {model}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-medium text-foreground">{t('settings.modal.sectionVisibilityTitle')}</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t('settings.modal.sectionVisibilityDescription')}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="reset-section-visibility"
                onClick={handleResetSectionVisibility}
                disabled={settingsBusy}
              >
                {t('common.reset')}
              </Button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              {t('settings.modal.sectionOrderHint')}
            </div>
            <div className="mt-4 space-y-2">
              {orderedSections.map((section, index) => {
                const visible = sectionVisibilityDraft[section.id]
                return (
                  <div
                    key={section.id}
                    data-section-id={section.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData('text/plain', section.id)
                      setDraggedSectionId(section.id)
                      setDragOverSectionId(section.id)
                    }}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (dragOverSectionId !== section.id) {
                        setDragOverSectionId(section.id)
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverSectionId === section.id) {
                        setDragOverSectionId(null)
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      const sourceId = event.dataTransfer.getData('text/plain') as DashboardSectionOrder[number] || draggedSectionId
                      if (!sourceId) return
                      setSectionOrderDraft((prev) => reorderSections(prev, sourceId, section.id))
                      setDraggedSectionId(null)
                      setDragOverSectionId(null)
                    }}
                    onDragEnd={() => {
                      setDraggedSectionId(null)
                      setDragOverSectionId(null)
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
                      dragOverSectionId === section.id
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border/70 bg-muted/10',
                      draggedSectionId === section.id && 'opacity-70',
                    )}
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground">{t(section.labelKey)}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('settings.modal.positionLabel', { position: index + 1, total: orderedSections.length })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        data-testid={`move-section-up-${section.id}`}
                        onClick={() => setSectionOrderDraft((prev) => moveSection(prev, section.id, -1))}
                        disabled={index === 0}
                        aria-label={t('settings.modal.moveSectionUp', { section: t(section.labelKey) })}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        data-testid={`move-section-down-${section.id}`}
                        onClick={() => setSectionOrderDraft((prev) => moveSection(prev, section.id, 1))}
                        disabled={index === orderedSections.length - 1}
                        aria-label={t('settings.modal.moveSectionDown', { section: t(section.labelKey) })}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <button
                        type="button"
                        data-testid={`toggle-section-visibility-${section.id}`}
                        aria-pressed={visible}
                        onClick={() => setSectionVisibilityDraft(prev => ({
                          ...prev,
                          [section.id]: !prev[section.id],
                        }))}
                        className={cn(
                          'inline-flex min-w-[88px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors',
                          visible
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-foreground'
                            : 'border-border bg-muted/20 text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        {visible ? t('common.visible') : t('common.hidden')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
                <Settings2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium text-foreground">{t('settings.modal.settingsBackupTitle')}</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{t('settings.modal.settingsBackupDescription')}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={onExportSettings} disabled={settingsBusy} className="gap-2">
                <Download className="h-4 w-4" />
                {t('settings.modal.exportSettings')}
              </Button>
              <Button variant="outline" onClick={onImportSettings} disabled={settingsBusy} className="gap-2">
                <Upload className="h-4 w-4" />
                {t('settings.modal.importSettings')}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
                <Database className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium text-foreground">{t('settings.modal.dataBackupTitle')}</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{t('settings.modal.dataBackupDescription')}</p>
              </div>
            </div>
            <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
              {t('settings.modal.dataImportPolicy')}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t('settings.modal.dataImportReplaceHint')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={onExportData} disabled={!hasData || dataBusy} className="gap-2">
                <Download className="h-4 w-4" />
                {t('settings.modal.exportData')}
              </Button>
              <Button variant="outline" onClick={onImportData} disabled={dataBusy} className="gap-2">
                <Upload className="h-4 w-4" />
                {t('settings.modal.importData')}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
                <LayoutPanelTop className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium text-foreground">{t('settings.modal.providerLimitsTitle')}</div>
                <p className="text-sm leading-relaxed text-muted-foreground">{t('settings.modal.providerLimitsDescription')}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="reset-provider-limits"
              onClick={handleResetProviderLimits}
              disabled={settingsBusy}
            >
              {t('common.reset')}
            </Button>
          </div>

          <div className="mt-4">
            {limitProviders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-sm text-muted-foreground text-center">
                {t('settings.modal.noProviders')}
              </div>
            ) : (
              <div className="space-y-3">
                {limitProviders.map((provider) => {
                  const config = limitDraft[provider]

                  return (
                    <div key={provider} data-provider-id={provider} className="rounded-2xl border border-border/50 bg-background/40 p-4">
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
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
          <Button
            variant="ghost"
            onClick={handleResetDrafts}
            disabled={settingsBusy}
            data-testid="reset-all-settings-drafts"
          >
            {t('common.reset')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={settingsBusy}>{t('settings.modal.close')}</Button>
            <Button onClick={() => void handleSave()} disabled={settingsBusy}>{t('settings.modal.save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
