import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import {
  DASHBOARD_DATE_PRESETS,
  DASHBOARD_SECTION_DEFINITION_MAP,
  DASHBOARD_VIEW_MODES,
} from '@/lib/dashboard-preferences'
import { formatCurrencyExact, formatDateTimeFull } from '@/lib/formatters'
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
  Server,
  Trash2,
  Upload,
} from 'lucide-react'
import type { DashboardSectionOrder, DataLoadSource } from '@/types'
import type { DashboardSettingsModalViewModel } from '@/types/dashboard-view-model'

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
  settingsBusy: boolean
}

/** Renders the language controls of the settings modal. */
export function SettingsLanguageSection({ viewModel, settingsBusy }: SettingsLanguageSectionProps) {
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
            onClick={() => {
              if (!settingsBusy) {
                viewModel.onLanguageChange(nextLanguage)
              }
            }}
            disabled={settingsBusy}
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
        {viewModel.systemOptions.length > 1 && (
          <div className="space-y-2">
            <div className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {t('settings.modal.filterSystems')}
            </div>
            <div className="flex flex-wrap gap-2">
              {viewModel.systemOptions.map((system) => {
                const selected = viewModel.defaultFilterDraft.systems.includes(system.id)
                return (
                  <button
                    key={system.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => viewModel.onToggleSystem(system.id)}
                    disabled={settingsBusy}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-primary/30 bg-primary text-primary-foreground'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-accent hover:text-foreground',
                      settingsBusy && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {system.hostname}
                    {system.isLocal ? ` · ${t('filterBar.localSystem')}` : ''}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">{t('settings.modal.filterSystemsHint')}</p>
          </div>
        )}
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
                disabled={settingsBusy}
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
                disabled={settingsBusy}
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
                    disabled={settingsBusy}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-primary/30 bg-primary text-primary-foreground'
                        : getProviderBadgeClasses(provider),
                      settingsBusy && 'cursor-not-allowed opacity-50',
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
                    disabled={settingsBusy}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-primary/30 bg-primary text-primary-foreground'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-accent hover:text-foreground',
                      settingsBusy && 'cursor-not-allowed opacity-50',
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
              draggable={!settingsBusy}
              onDragStart={(event) => {
                if (settingsBusy) {
                  event.preventDefault()
                  return
                }
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', section.id)
                viewModel.onDraggedSectionChange(section.id)
                viewModel.onDragOverSectionChange(section.id)
              }}
              onDragOver={(event) => {
                if (settingsBusy) return
                event.preventDefault()
                if (viewModel.dragOverSectionId !== section.id) {
                  viewModel.onDragOverSectionChange(section.id)
                }
              }}
              onDragLeave={() => {
                if (settingsBusy) return
                if (viewModel.dragOverSectionId === section.id) {
                  viewModel.onDragOverSectionChange(null)
                }
              }}
              onDrop={(event) => {
                if (settingsBusy) {
                  event.preventDefault()
                  return
                }
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
                if (settingsBusy) return
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
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/40 text-muted-foreground"
              >
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
                  disabled={settingsBusy || index === 0}
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
                  disabled={settingsBusy || index === orderedSections.length - 1}
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
                  disabled={settingsBusy}
                  className={cn(
                    'inline-flex min-w-[88px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium tracking-[0.12em] uppercase transition-colors',
                    visible
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-foreground'
                      : 'border-border bg-muted/20 text-muted-foreground hover:bg-accent hover:text-foreground',
                    settingsBusy && 'cursor-not-allowed opacity-50',
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
  settingsBusy: boolean
}

/** Renders motion settings inside the settings modal. */
export function SettingsMotionSection({ viewModel, settingsBusy }: SettingsMotionSectionProps) {
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
              onClick={() => {
                if (!settingsBusy) {
                  viewModel.onReducedMotionPreferenceChange(value)
                }
              }}
              disabled={settingsBusy}
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

type SettingsSystemTransferSectionProps = Pick<
  DashboardSettingsModalViewModel,
  | 'systems'
  | 'unreadableSystemFiles'
  | 'onExportSystem'
  | 'onImportSystems'
  | 'onDeleteSystem'
  | 'onDeleteAllSystems'
  | 'systemImportConflicts'
  | 'systemImportRetries'
  | 'onReplaceSystemConflicts'
  | 'onSkipSystemConflicts'
  | 'onCancelSystemConflicts'
  | 'onRetrySystemImports'
  | 'onCancelSystemRetries'
> & { dataBusy: boolean }

/** Renders host-only system transfer actions and imported-system management. */
export function SettingsSystemTransferSection({
  systems,
  unreadableSystemFiles,
  dataBusy,
  onExportSystem,
  onImportSystems,
  onDeleteSystem,
  onDeleteAllSystems,
  systemImportConflicts,
  systemImportRetries,
  onReplaceSystemConflicts,
  onSkipSystemConflicts,
  onCancelSystemConflicts,
  onRetrySystemImports,
  onCancelSystemRetries,
}: SettingsSystemTransferSectionProps) {
  const { t } = useTranslation()
  const [pendingDelete, setPendingDelete] = useState<
    { kind: 'all' } | { kind: 'system'; hostname: string } | null
  >(null)
  const conflictCancelRef = useRef<HTMLButtonElement | null>(null)
  const retryCancelRef = useRef<HTMLButtonElement | null>(null)
  const deleteCancelRef = useRef<HTMLButtonElement | null>(null)
  const importedSystems = systems.filter((system) => !system.isLocal)
  const hasLocalData = systems.some((system) => system.isLocal && system.data.daily.length > 0)
  const hasImportedFiles = importedSystems.length > 0 || unreadableSystemFiles.length > 0

  useEffect(() => {
    if (systemImportConflicts.length > 0) conflictCancelRef.current?.focus()
  }, [systemImportConflicts.length])

  useEffect(() => {
    if (systemImportRetries.length > 0) retryCancelRef.current?.focus()
  }, [systemImportRetries.length])

  useEffect(() => {
    if (pendingDelete) deleteCancelRef.current?.focus()
  }, [pendingDelete])

  const handleAlertEscape = (event: ReactKeyboardEvent<HTMLButtonElement>, dismiss: () => void) => {
    if (event.key !== 'Escape' || dataBusy) return
    event.preventDefault()
    event.stopPropagation()
    dismiss()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    if (pendingDelete.kind === 'all') {
      await onDeleteAllSystems()
    } else {
      await onDeleteSystem(pendingDelete.hostname)
    }
    setPendingDelete(null)
  }

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/60 p-4 backdrop-blur-xl"
      data-testid="settings-system-transfer-section"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
          <Server className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-medium text-foreground">
            {t('settings.modal.systemTransferTitle')}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('settings.modal.systemTransferDescription')}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={onExportSystem} disabled={!hasLocalData || dataBusy}>
          <Download className="mr-2 h-4 w-4" />
          {t('settings.modal.exportSystem')}
        </Button>
        <Button variant="outline" onClick={onImportSystems} disabled={dataBusy}>
          <Upload className="mr-2 h-4 w-4" />
          {t('settings.modal.importSystems')}
        </Button>
      </div>

      {systemImportConflicts.length > 0 && (
        <div
          role="alertdialog"
          aria-labelledby="system-import-conflict-title"
          aria-describedby="system-import-conflict-description"
          className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
          data-testid="system-import-conflict-dialog"
        >
          <div id="system-import-conflict-title" className="text-sm font-semibold text-foreground">
            {t('settings.modal.systemConflictTitle')}
          </div>
          <p id="system-import-conflict-description" className="mt-1 text-xs text-muted-foreground">
            {t('settings.modal.systemConflictDescription', {
              systems: systemImportConflicts.join(', '),
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void onReplaceSystemConflicts()}
              onKeyDown={(event) => handleAlertEscape(event, onCancelSystemConflicts)}
              disabled={dataBusy}
            >
              {t('settings.modal.replaceAllSystems')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onSkipSystemConflicts()}
              onKeyDown={(event) => handleAlertEscape(event, onCancelSystemConflicts)}
              disabled={dataBusy}
            >
              {t('settings.modal.skipAllSystems')}
            </Button>
            <Button
              ref={conflictCancelRef}
              size="sm"
              variant="ghost"
              onClick={onCancelSystemConflicts}
              onKeyDown={(event) => handleAlertEscape(event, onCancelSystemConflicts)}
              disabled={dataBusy}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {systemImportRetries.length > 0 && (
        <div
          role="alertdialog"
          aria-labelledby="system-import-retry-title"
          aria-describedby="system-import-retry-description"
          className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
          data-testid="system-import-retry-dialog"
        >
          <div id="system-import-retry-title" className="text-sm font-semibold text-foreground">
            {t('settings.modal.systemRetryTitle')}
          </div>
          <p id="system-import-retry-description" className="mt-1 text-xs text-muted-foreground">
            {t('settings.modal.systemRetryDescription', {
              systems: systemImportRetries.join(', '),
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void onRetrySystemImports()}
              onKeyDown={(event) => handleAlertEscape(event, onCancelSystemRetries)}
              disabled={dataBusy}
            >
              {t('settings.modal.retrySystemImports')}
            </Button>
            <Button
              ref={retryCancelRef}
              size="sm"
              variant="ghost"
              onClick={onCancelSystemRetries}
              onKeyDown={(event) => handleAlertEscape(event, onCancelSystemRetries)}
              disabled={dataBusy}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-border/50 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium text-foreground">
              {t('settings.modal.importedSystemsTitle')}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.modal.importedSystemsDescription')}
            </p>
          </div>
          {hasImportedFiles && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setPendingDelete({ kind: 'all' })}
              disabled={dataBusy}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('settings.modal.deleteAllSystems')}
            </Button>
          )}
        </div>

        {unreadableSystemFiles.length > 0 && (
          <div
            role="status"
            className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"
          >
            <div className="text-sm font-medium text-foreground">
              {t('settings.modal.unreadableSystemsTitle')}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('settings.modal.unreadableSystemsDescription')}
            </p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-muted-foreground">
              {unreadableSystemFiles.map((file) => (
                <li key={file.filename}>{file.filename}</li>
              ))}
            </ul>
          </div>
        )}

        {!hasImportedFiles ? (
          <p className="mt-3 rounded-xl border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
            {t('settings.modal.noImportedSystems')}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {importedSystems.map((system) => (
              <div
                key={system.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2"
              >
                <div>
                  <div className="font-mono text-sm font-medium text-foreground">
                    {system.hostname}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('settings.modal.systemUsageSummary', {
                      days: system.data.daily.length,
                      cost: formatCurrencyExact(system.data.totals?.totalCost ?? 0),
                    })}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPendingDelete({ kind: 'system', hostname: system.hostname })}
                  disabled={dataBusy}
                  aria-label={t('settings.modal.deleteSystemLabel', {
                    hostname: system.hostname,
                  })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <div
          role="alertdialog"
          aria-labelledby="delete-system-title"
          aria-describedby="delete-system-description"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3"
          data-testid="delete-system-confirmation"
        >
          <div id="delete-system-title" className="text-sm font-semibold text-foreground">
            {t('settings.modal.deleteSystemTitle')}
          </div>
          <p id="delete-system-description" className="mt-1 text-xs text-muted-foreground">
            {pendingDelete.kind === 'all'
              ? t('settings.modal.deleteAllSystemsConfirmation')
              : t('settings.modal.deleteSystemConfirmation', {
                  hostname: pendingDelete.hostname,
                })}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void confirmDelete()}
              onKeyDown={(event) => handleAlertEscape(event, () => setPendingDelete(null))}
              disabled={dataBusy}
            >
              {t('common.delete')}
            </Button>
            <Button
              ref={deleteCancelRef}
              variant="outline"
              size="sm"
              onClick={() => setPendingDelete(null)}
              onKeyDown={(event) => handleAlertEscape(event, () => setPendingDelete(null))}
              disabled={dataBusy}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface SettingsProviderLimitsSectionProps {
  viewModel: SettingsModalProviderLimitsDraftViewModel
  settingsBusy: boolean
}

interface SettingsProviderLimitRowProps {
  provider: string
  config: SettingsModalProviderLimitsDraftViewModel['limits'][string]
  viewModel: SettingsModalProviderLimitsDraftViewModel
  settingsBusy: boolean
}

function SettingsProviderLimitRow({
  provider,
  config,
  viewModel,
  settingsBusy,
}: SettingsProviderLimitRowProps) {
  const { t } = useTranslation()
  const [subscriptionPriceInput, setSubscriptionPriceInput] = useState(() =>
    String(config.subscriptionPrice),
  )
  const [monthlyLimitInput, setMonthlyLimitInput] = useState(() => String(config.monthlyLimit))

  useEffect(() => {
    setSubscriptionPriceInput(String(config.subscriptionPrice))
  }, [config.subscriptionPrice])

  useEffect(() => {
    setMonthlyLimitInput(String(config.monthlyLimit))
  }, [config.monthlyLimit])

  const commitSubscriptionPrice = () => {
    if (settingsBusy) return
    const subscriptionPrice = parseSettingsNumberInput(subscriptionPriceInput)
    setSubscriptionPriceInput(String(subscriptionPrice))
    if (subscriptionPrice !== config.subscriptionPrice) {
      viewModel.onProviderChange(provider, { subscriptionPrice })
    }
  }

  const commitMonthlyLimit = () => {
    if (settingsBusy) return
    const monthlyLimit = parseSettingsNumberInput(monthlyLimitInput)
    setMonthlyLimitInput(String(monthlyLimit))
    if (monthlyLimit !== config.monthlyLimit) {
      viewModel.onProviderChange(provider, { monthlyLimit })
    }
  }

  const handleSubscriptionPriceKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitSubscriptionPrice()
    }
  }

  const handleMonthlyLimitKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitMonthlyLimit()
    }
  }

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
              onClick={() => {
                if (!settingsBusy) {
                  viewModel.onProviderChange(provider, {
                    hasSubscription: !config.hasSubscription,
                  })
                }
              }}
              disabled={settingsBusy}
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                config.hasSubscription
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-border bg-muted/20 text-muted-foreground hover:bg-accent',
                settingsBusy && 'cursor-not-allowed opacity-50',
              )}
            >
              {config.hasSubscription ? t('common.enabled') : t('limits.statuses.noSubscription')}
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
              value={subscriptionPriceInput}
              disabled={settingsBusy || !config.hasSubscription}
              onChange={(event) => setSubscriptionPriceInput(event.target.value)}
              onBlur={commitSubscriptionPrice}
              onKeyDown={handleSubscriptionPriceKeyDown}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {t('limits.modal.monthlyLimit')}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={monthlyLimitInput}
              disabled={settingsBusy}
              onChange={(event) => setMonthlyLimitInput(event.target.value)}
              onBlur={commitMonthlyLimit}
              onKeyDown={handleMonthlyLimitKeyDown}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
        </div>
      </div>
    </div>
  )
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
                <SettingsProviderLimitRow
                  key={provider}
                  provider={provider}
                  config={config}
                  viewModel={viewModel}
                  settingsBusy={settingsBusy}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
