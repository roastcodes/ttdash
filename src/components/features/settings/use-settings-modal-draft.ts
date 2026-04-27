import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import {
  DEFAULT_DASHBOARD_FILTERS,
  getDefaultDashboardSectionOrder,
  getDefaultDashboardSectionVisibility,
} from '@/lib/dashboard-preferences'
import type { DashboardSettingsModalViewModel } from '@/types/dashboard-view-model'
import type {
  AppLanguage,
  DashboardDatePreset,
  DashboardDefaultFilters,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ProviderLimits,
  ReducedMotionPreference,
  ViewMode,
} from '@/types'
import { useToast } from '@/lib/toast'
import {
  buildSettingsProviderLimitDraft,
  cloneSettingsDefaultFilters,
  cloneSettingsSectionOrder,
  cloneSettingsSectionVisibility,
  moveSettingsSection,
  patchSettingsProviderLimitDraft,
  normalizeSettingsSelection,
  reorderSettingsSections,
  toggleSettingsSelection,
} from './settings-modal-helpers'

function normalizeErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message.trim()
  }

  return null
}

type SettingsModalDraftParams = Pick<
  DashboardSettingsModalViewModel,
  | 'open'
  | 'language'
  | 'reducedMotionPreference'
  | 'limitProviders'
  | 'filterProviders'
  | 'models'
  | 'limits'
  | 'defaultFilters'
  | 'sectionVisibility'
  | 'sectionOrder'
  | 'onSaveSettings'
  | 'onOpenChange'
>

/** Describes the editable language and motion state of the settings modal. */
export interface SettingsModalGeneralDraftViewModel {
  languageDraft: AppLanguage
  reducedMotionPreferenceDraft: ReducedMotionPreference
  onLanguageChange: (language: AppLanguage) => void
  onReducedMotionPreferenceChange: (preference: ReducedMotionPreference) => void
}

/** Describes the editable default-filter state of the settings modal. */
export interface SettingsModalDefaultsDraftViewModel {
  defaultFilterDraft: DashboardDefaultFilters
  providerOptions: string[]
  modelOptions: string[]
  onViewModeChange: (mode: ViewMode) => void
  onDatePresetChange: (preset: DashboardDatePreset) => void
  onToggleProvider: (provider: string) => void
  onToggleModel: (model: string) => void
  onReset: () => void
}

/** Describes the editable section-visibility and section-order state of the settings modal. */
export interface SettingsModalSectionsDraftViewModel {
  sectionOrder: DashboardSectionOrder
  sectionVisibility: DashboardSectionVisibility
  draggedSectionId: DashboardSectionOrder[number] | null
  dragOverSectionId: DashboardSectionOrder[number] | null
  onDraggedSectionChange: (sectionId: DashboardSectionOrder[number] | null) => void
  onDragOverSectionChange: (sectionId: DashboardSectionOrder[number] | null) => void
  onMoveSection: (sectionId: DashboardSectionOrder[number], direction: -1 | 1) => void
  onReorderSections: (
    sourceId: DashboardSectionOrder[number],
    targetId: DashboardSectionOrder[number],
  ) => void
  onToggleSectionVisibility: (sectionId: DashboardSectionOrder[number]) => void
  onReset: () => void
}

/** Describes the editable provider-limit draft state of the settings modal. */
export interface SettingsModalProviderLimitsDraftViewModel {
  limitProviders: string[]
  limits: ProviderLimits
  onProviderChange: (provider: string, patch: Partial<ProviderLimits[string]>) => void
  onReset: () => void
}

/** Describes the footer actions owned by the settings modal draft controller. */
export interface SettingsModalFooterViewModel {
  onResetAll: () => void
  onClose: () => void
  onSave: () => Promise<void>
}

/** Groups the internal draft state emitted by the settings modal draft controller. */
export interface SettingsModalDraftViewModel {
  general: SettingsModalGeneralDraftViewModel
  defaults: SettingsModalDefaultsDraftViewModel
  sections: SettingsModalSectionsDraftViewModel
  providerLimits: SettingsModalProviderLimitsDraftViewModel
  footer: SettingsModalFooterViewModel
}

/** Owns the editable draft state and save/reset orchestration for the settings modal. */
export function useSettingsModalDraft({
  open,
  language,
  reducedMotionPreference,
  limitProviders,
  filterProviders,
  models,
  limits,
  defaultFilters,
  sectionVisibility,
  sectionOrder,
  onSaveSettings,
  onOpenChange,
}: SettingsModalDraftParams): SettingsModalDraftViewModel {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const draftInitializedRef = useRef(false)
  const [languageDraft, setLanguageDraft] = useState<AppLanguage>(language)
  const [reducedMotionPreferenceDraft, setReducedMotionPreferenceDraft] =
    useState<ReducedMotionPreference>(reducedMotionPreference)
  const [limitDraft, setLimitDraft] = useState<ProviderLimits>(() =>
    buildSettingsProviderLimitDraft(limitProviders, limits),
  )
  const [defaultFilterDraft, setDefaultFilterDraft] = useState<DashboardDefaultFilters>(() =>
    cloneSettingsDefaultFilters(defaultFilters),
  )
  const [sectionVisibilityDraft, setSectionVisibilityDraft] = useState<DashboardSectionVisibility>(
    () => cloneSettingsSectionVisibility(sectionVisibility),
  )
  const [sectionOrderDraft, setSectionOrderDraft] = useState<DashboardSectionOrder>(() =>
    cloneSettingsSectionOrder(sectionOrder),
  )
  const [draggedSectionId, setDraggedSectionId] = useState<DashboardSectionOrder[number] | null>(
    null,
  )
  const [dragOverSectionId, setDragOverSectionId] = useState<DashboardSectionOrder[number] | null>(
    null,
  )

  useEffect(() => {
    if (!open) {
      draftInitializedRef.current = false
      return
    }
    if (draftInitializedRef.current) return

    draftInitializedRef.current = true
    setLanguageDraft(language)
    setReducedMotionPreferenceDraft(reducedMotionPreference)
    setLimitDraft(buildSettingsProviderLimitDraft(limitProviders, limits))
    setDefaultFilterDraft(cloneSettingsDefaultFilters(defaultFilters))
    setSectionVisibilityDraft(cloneSettingsSectionVisibility(sectionVisibility))
    setSectionOrderDraft(cloneSettingsSectionOrder(sectionOrder))
    setDraggedSectionId(null)
    setDragOverSectionId(null)
  }, [
    open,
    language,
    reducedMotionPreference,
    limitProviders,
    limits,
    defaultFilters,
    sectionVisibility,
    sectionOrder,
  ])

  const providerOptions = useMemo(
    () => normalizeSettingsSelection([...filterProviders, ...defaultFilterDraft.providers]),
    [filterProviders, defaultFilterDraft.providers],
  )

  const modelOptions = useMemo(
    () => normalizeSettingsSelection([...models, ...defaultFilterDraft.models]),
    [models, defaultFilterDraft.models],
  )

  const handleResetDrafts = () => {
    setLanguageDraft(DEFAULT_APP_SETTINGS.language)
    setReducedMotionPreferenceDraft(DEFAULT_APP_SETTINGS.reducedMotionPreference)
    setLimitDraft(buildSettingsProviderLimitDraft(limitProviders, {}))
    setDefaultFilterDraft(cloneSettingsDefaultFilters(DEFAULT_DASHBOARD_FILTERS))
    setSectionVisibilityDraft(getDefaultDashboardSectionVisibility())
    setSectionOrderDraft(getDefaultDashboardSectionOrder())
    setDraggedSectionId(null)
    setDragOverSectionId(null)
  }

  const handleSave = async () => {
    try {
      await onSaveSettings({
        language: languageDraft,
        reducedMotionPreference: reducedMotionPreferenceDraft,
        providerLimits: buildSettingsProviderLimitDraft(limitProviders, limitDraft),
        defaultFilters: {
          ...defaultFilterDraft,
          providers: normalizeSettingsSelection(defaultFilterDraft.providers),
          models: normalizeSettingsSelection(defaultFilterDraft.models),
        },
        sectionVisibility: sectionVisibilityDraft,
        sectionOrder: sectionOrderDraft,
      })
      onOpenChange(false)
    } catch (error) {
      addToast(normalizeErrorMessage(error) ?? t('api.saveSettingsFailed'), 'error')
    }
  }

  return {
    general: {
      languageDraft,
      reducedMotionPreferenceDraft,
      onLanguageChange: setLanguageDraft,
      onReducedMotionPreferenceChange: setReducedMotionPreferenceDraft,
    },
    defaults: {
      defaultFilterDraft,
      providerOptions,
      modelOptions,
      onViewModeChange: (viewMode) => setDefaultFilterDraft((prev) => ({ ...prev, viewMode })),
      onDatePresetChange: (datePreset) =>
        setDefaultFilterDraft((prev) => ({ ...prev, datePreset })),
      onToggleProvider: (provider) =>
        setDefaultFilterDraft((prev) => ({
          ...prev,
          providers: toggleSettingsSelection(prev.providers, provider),
        })),
      onToggleModel: (model) =>
        setDefaultFilterDraft((prev) => ({
          ...prev,
          models: toggleSettingsSelection(prev.models, model),
        })),
      onReset: () => setDefaultFilterDraft(cloneSettingsDefaultFilters(DEFAULT_DASHBOARD_FILTERS)),
    },
    sections: {
      sectionOrder: sectionOrderDraft,
      sectionVisibility: sectionVisibilityDraft,
      draggedSectionId,
      dragOverSectionId,
      onDraggedSectionChange: setDraggedSectionId,
      onDragOverSectionChange: setDragOverSectionId,
      onMoveSection: (sectionId, direction) =>
        setSectionOrderDraft((prev) => moveSettingsSection(prev, sectionId, direction)),
      onReorderSections: (sourceId, targetId) =>
        setSectionOrderDraft((prev) => reorderSettingsSections(prev, sourceId, targetId)),
      onToggleSectionVisibility: (sectionId) =>
        setSectionVisibilityDraft((prev) => ({
          ...prev,
          [sectionId]: !prev[sectionId],
        })),
      onReset: () => {
        setSectionVisibilityDraft(getDefaultDashboardSectionVisibility())
        setSectionOrderDraft(getDefaultDashboardSectionOrder())
      },
    },
    providerLimits: {
      limitProviders,
      limits: limitDraft,
      onProviderChange: (provider, patch) =>
        setLimitDraft((prev) => patchSettingsProviderLimitDraft(prev, provider, patch)),
      onReset: () => setLimitDraft(buildSettingsProviderLimitDraft(limitProviders, {})),
    },
    footer: {
      onResetAll: handleResetDrafts,
      onClose: () => onOpenChange(false),
      onSave: handleSave,
    },
  }
}
