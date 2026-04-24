import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import {
  DASHBOARD_DATE_PRESETS,
  DASHBOARD_SECTION_DEFINITION_MAP,
  DASHBOARD_VIEW_MODES,
} from '@/lib/dashboard-preferences'
import { formatDateTimeFull } from '@/lib/formatters'
import { SUPPORTED_LANGUAGES } from '@/lib/i18n'
import { getProviderBadgeClasses } from '@/lib/model-utils'
import { DEFAULT_PROVIDER_LIMIT_CONFIG } from '@/lib/provider-limits'
import type {
  SettingsModalDefaultsDraftViewModel,
  SettingsModalGeneralDraftViewModel,
  SettingsModalProviderLimitsDraftViewModel,
  SettingsModalSectionsDraftViewModel,
} from './use-settings-modal-draft'
import type { SettingsVersionStatusViewModel } from './use-settings-modal-version-status'
import { parseSettingsNumberInput } from './settings-modal-helpers'
import {
  ArrowDown,
  ArrowUp,
  Database,
  Download,
  Eye,
  Filter,
  GripVertical,
  Languages,
  LayoutPanelTop,
  Settings2,
  Upload,
} from 'lucide-react'
import type { DashboardSectionOrder, DataLoadSource } from '@/types'

interface SettingsStatusSectionProps {
  lastLoadedAt?: string | null
  lastLoadSource?: DataLoadSource | null
  cliAutoLoadActive: boolean
}

/** Renders the current local data-status summary for the settings modal. */
export function SettingsStatusSection({
  lastLoadedAt,
  lastLoadSource,
  cliAutoLoadActive,
}: SettingsStatusSectionProps) {
  const { t } = useTranslation()

  const loadSourceLabel = lastLoadSource
    ? t(`settings.modal.sources.${lastLoadSource}`)
    : t('settings.modal.sources.unknown')

  return (
    <div
      className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-3"
      data-testid="settings-status-section"
    >
      <div className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {t('settings.modal.dataStatus')}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('settings.modal.lastLoaded')}
          </div>
          <div className="text-sm font-medium text-foreground">
            {lastLoadedAt ? formatDateTimeFull(lastLoadedAt) : t('common.notAvailable')}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('settings.modal.loadedVia')}
          </div>
          <div className="text-sm font-medium text-foreground">{loadSourceLabel}</div>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            {t('settings.modal.cliAutoLoad')}
          </div>
          <div className="text-sm font-medium text-foreground">
            {cliAutoLoadActive ? t('common.enabled') : t('common.disabled')}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SettingsLanguageSectionProps {
  viewModel: SettingsModalGeneralDraftViewModel
}

/** Renders the language controls of the settings modal. */
export function SettingsLanguageSection({ viewModel }: SettingsLanguageSectionProps) {
  const { t } = useTranslation()

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl"
      data-testid="settings-language-section"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
          <Languages className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-medium text-foreground">
            {t('settings.modal.languageTitle')}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('settings.modal.languageDescription')}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUPPORTED_LANGUAGES.map((nextLanguage) => (
          <Button
            key={nextLanguage}
            type="button"
            data-testid={`settings-language-${nextLanguage}`}
            aria-pressed={viewModel.languageDraft === nextLanguage}
            variant={viewModel.languageDraft === nextLanguage ? 'default' : 'outline'}
            onClick={() => viewModel.onLanguageChange(nextLanguage)}
          >
            {t(`app.languages.${nextLanguage}`)}
          </Button>
        ))}
      </div>
    </div>
  )
}

interface SettingsDefaultsSectionProps {
  viewModel: SettingsModalDefaultsDraftViewModel
  settingsBusy: boolean
}

/** Renders the editable default-filter controls of the settings modal. */
export function SettingsDefaultsSection({ viewModel, settingsBusy }: SettingsDefaultsSectionProps) {
  const { t } = useTranslation()

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl"
      data-testid="settings-defaults-section"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
            <Filter className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium text-foreground">
              {t('settings.modal.defaultFiltersTitle')}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('settings.modal.defaultFiltersDescription')}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="reset-default-filters"
          onClick={viewModel.onReset}
          disabled={settingsBusy}
        >
          {t('common.reset')}
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <div className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t('settings.modal.defaultViewMode')}
          </div>
          <div className="flex flex-wrap gap-2">
            {DASHBOARD_VIEW_MODES.map((mode) => (
              <Button
                key={mode}
                type="button"
                data-testid={`settings-default-view-mode-${mode}`}
                aria-pressed={viewModel.defaultFilterDraft.viewMode === mode}
                variant={viewModel.defaultFilterDraft.viewMode === mode ? 'default' : 'outline'}
                onClick={() => viewModel.onViewModeChange(mode)}
              >
                {t(`settings.modal.viewModes.${mode}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t('settings.modal.defaultDateRange')}
          </div>
          <div className="flex flex-wrap gap-2">
            {DASHBOARD_DATE_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                data-testid={`settings-default-date-preset-${preset}`}
                aria-pressed={viewModel.defaultFilterDraft.datePreset === preset}
                variant={viewModel.defaultFilterDraft.datePreset === preset ? 'default' : 'outline'}
                onClick={() => viewModel.onDatePresetChange(preset)}
              >
                {t(`settings.modal.datePresets.${preset}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t('settings.modal.filterProviders')}
          </div>
          {viewModel.providerOptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
              {t('settings.modal.noProviders')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {viewModel.providerOptions.map((provider) => {
                const selected = viewModel.defaultFilterDraft.providers.includes(provider)
                return (
                  <button
                    key={provider}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => viewModel.onToggleProvider(provider)}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-primary/30 bg-primary text-primary-foreground'
                        : getProviderBadgeClasses(provider),
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
          <div className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {t('settings.modal.filterModels')}
          </div>
          {viewModel.modelOptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
              {t('settings.modal.noModels')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {viewModel.modelOptions.map((model) => {
                const selected = viewModel.defaultFilterDraft.models.includes(model)
                return (
                  <button
                    key={model}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => viewModel.onToggleModel(model)}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-primary/30 bg-primary text-primary-foreground'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-accent hover:text-foreground',
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
  )
}

interface SettingsSectionsSectionProps {
  viewModel: SettingsModalSectionsDraftViewModel
  settingsBusy: boolean
}

/** Renders the editable section-visibility and section-order controls of the settings modal. */
export function SettingsSectionsSection({ viewModel, settingsBusy }: SettingsSectionsSectionProps) {
  const { t } = useTranslation()

  const orderedSections = useMemo(
    () =>
      viewModel.sectionOrder
        .map((sectionId) => DASHBOARD_SECTION_DEFINITION_MAP[sectionId])
        .filter((section) => section !== undefined),
    [viewModel.sectionOrder],
  )

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl"
      data-testid="settings-sections-section"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
            <Eye className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium text-foreground">
              {t('settings.modal.sectionVisibilityTitle')}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('settings.modal.sectionVisibilityDescription')}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="reset-section-visibility"
          onClick={viewModel.onReset}
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
          const visible = viewModel.sectionVisibility[section.id]

          return (
            <div
              key={section.id}
              data-section-id={section.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', section.id)
                viewModel.onDraggedSectionChange(section.id)
                viewModel.onDragOverSectionChange(section.id)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                if (viewModel.dragOverSectionId !== section.id) {
                  viewModel.onDragOverSectionChange(section.id)
                }
              }}
              onDragLeave={() => {
                if (viewModel.dragOverSectionId === section.id) {
                  viewModel.onDragOverSectionChange(null)
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                const sourceId =
                  (event.dataTransfer.getData('text/plain') as DashboardSectionOrder[number]) ||
                  viewModel.draggedSectionId
                if (!sourceId) return

                viewModel.onReorderSections(sourceId, section.id)
                viewModel.onDraggedSectionChange(null)
                viewModel.onDragOverSectionChange(null)
              }}
              onDragEnd={() => {
                viewModel.onDraggedSectionChange(null)
                viewModel.onDragOverSectionChange(null)
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
                viewModel.dragOverSectionId === section.id
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border/70 bg-muted/10',
                viewModel.draggedSectionId === section.id && 'opacity-70',
              )}
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">{t(section.labelKey)}</div>
                <div className="text-xs text-muted-foreground">
                  {t('settings.modal.positionLabel', {
                    position: index + 1,
                    total: orderedSections.length,
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  data-testid={`move-section-up-${section.id}`}
                  onClick={() => viewModel.onMoveSection(section.id, -1)}
                  disabled={index === 0}
                  aria-label={t('settings.modal.moveSectionUp', {
                    section: t(section.labelKey),
                  })}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  data-testid={`move-section-down-${section.id}`}
                  onClick={() => viewModel.onMoveSection(section.id, 1)}
                  disabled={index === orderedSections.length - 1}
                  aria-label={t('settings.modal.moveSectionDown', {
                    section: t(section.labelKey),
                  })}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  data-testid={`toggle-section-visibility-${section.id}`}
                  aria-pressed={visible}
                  onClick={() => viewModel.onToggleSectionVisibility(section.id)}
                  className={cn(
                    'inline-flex min-w-[88px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium tracking-[0.12em] uppercase transition-colors',
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
  )
}

interface SettingsMotionSectionProps {
  viewModel: SettingsModalGeneralDraftViewModel
}

/** Renders motion settings inside the settings modal. */
export function SettingsMotionSection({ viewModel }: SettingsMotionSectionProps) {
  const { t } = useTranslation()

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl"
      data-testid="settings-motion-section"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
          <Settings2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-medium text-foreground">
            {t('settings.modal.dashboardSettingsTitle')}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('settings.modal.dashboardSettingsDescription')}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {t('settings.modal.reducedMotionTitle')}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('settings.modal.reducedMotionDescription')}
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['system', 'settings.modal.reducedMotionOptions.system'],
              ['always', 'settings.modal.reducedMotionOptions.always'],
              ['never', 'settings.modal.reducedMotionOptions.never'],
            ] as const
          ).map(([value, labelKey]) => (
            <Button
              key={value}
              type="button"
              data-testid={`settings-reduced-motion-${value}`}
              aria-pressed={viewModel.reducedMotionPreferenceDraft === value}
              variant={viewModel.reducedMotionPreferenceDraft === value ? 'default' : 'outline'}
              onClick={() => viewModel.onReducedMotionPreferenceChange(value)}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface SettingsToktrackVersionSectionProps {
  versionStatus: SettingsVersionStatusViewModel
}

/** Renders the toktrack version status inside the settings modal. */
export function SettingsToktrackVersionSection({
  versionStatus,
}: SettingsToktrackVersionSectionProps) {
  const { t } = useTranslation()

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl"
      data-testid="settings-toktrack-section"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
          <Settings2 className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-medium text-foreground">
            {t('settings.modal.toktrackVersionTitle')}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('settings.modal.toktrackVersionDescription')}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-mono text-sm font-medium text-foreground"
            data-testid="settings-toktrack-version"
          >
            {versionStatus.configuredVersion}
          </span>
          <span
            className={cn('text-xs font-medium', versionStatus.statusToneClass)}
            data-testid="settings-toktrack-status"
          >
            {versionStatus.statusLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

interface SettingsBackupsSectionProps {
  hasData: boolean
  settingsBusy: boolean
  dataBusy: boolean
  onExportSettings: () => void
  onImportSettings: () => void
  onExportData: () => void
  onImportData: () => void
}

/** Renders the settings and data backup actions of the settings modal. */
export function SettingsBackupsSection({
  hasData,
  settingsBusy,
  dataBusy,
  onExportSettings,
  onImportSettings,
  onExportData,
  onImportData,
}: SettingsBackupsSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 xl:grid-cols-2" data-testid="settings-backups-section">
      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
            <Settings2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium text-foreground">
              {t('settings.modal.settingsBackupTitle')}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('settings.modal.settingsBackupDescription')}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={onExportSettings}
            disabled={settingsBusy}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t('settings.modal.exportSettings')}
          </Button>
          <Button
            variant="outline"
            onClick={onImportSettings}
            disabled={settingsBusy}
            className="gap-2"
          >
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
            <div className="text-sm font-medium text-foreground">
              {t('settings.modal.dataBackupTitle')}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('settings.modal.dataBackupDescription')}
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
          {t('settings.modal.dataImportPolicy')}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t('settings.modal.dataImportReplaceHint')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={onExportData}
            disabled={!hasData || dataBusy}
            className="gap-2"
          >
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
  )
}

interface SettingsProviderLimitsSectionProps {
  viewModel: SettingsModalProviderLimitsDraftViewModel
  settingsBusy: boolean
}

/** Renders the provider-limit editor of the settings modal. */
export function SettingsProviderLimitsSection({
  viewModel,
  settingsBusy,
}: SettingsProviderLimitsSectionProps) {
  const { t } = useTranslation()

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl"
      data-testid="settings-provider-limits-section"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
            <LayoutPanelTop className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium text-foreground">
              {t('settings.modal.providerLimitsTitle')}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('settings.modal.providerLimitsDescription')}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="reset-provider-limits"
          onClick={viewModel.onReset}
          disabled={settingsBusy}
        >
          {t('common.reset')}
        </Button>
      </div>

      <div className="mt-4">
        {viewModel.limitProviders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            {t('settings.modal.noProviders')}
          </div>
        ) : (
          <div className="space-y-3">
            {viewModel.limitProviders.map((provider) => {
              const config = viewModel.limits[provider] ?? DEFAULT_PROVIDER_LIMIT_CONFIG

              return (
                <div
                  key={provider}
                  data-provider-id={provider}
                  className="rounded-2xl border border-border/50 bg-background/40 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                            getProviderBadgeClasses(provider),
                          )}
                        >
                          {provider}
                        </span>
                        <button
                          type="button"
                          data-testid={`settings-provider-subscription-${provider}`}
                          onClick={() =>
                            viewModel.onProviderChange(provider, {
                              hasSubscription: !config.hasSubscription,
                            })
                          }
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                            config.hasSubscription
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : 'border-border bg-muted/20 text-muted-foreground hover:bg-accent',
                          )}
                        >
                          {config.hasSubscription
                            ? t('common.enabled')
                            : t('limits.statuses.noSubscription')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[420px]">
                      <label className="space-y-1.5">
                        <span className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                          {t('limits.modal.subscriptionPerMonth')}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={config.subscriptionPrice}
                          disabled={!config.hasSubscription}
                          onChange={(event) =>
                            viewModel.onProviderChange(provider, {
                              subscriptionPrice: parseSettingsNumberInput(event.target.value),
                            })
                          }
                          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </label>

                      <label className="space-y-1.5">
                        <span className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                          {t('limits.modal.monthlyLimit')}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={config.monthlyLimit}
                          onChange={(event) =>
                            viewModel.onProviderChange(provider, {
                              monthlyLimit: parseSettingsNumberInput(event.target.value),
                            })
                          }
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
  )
}
