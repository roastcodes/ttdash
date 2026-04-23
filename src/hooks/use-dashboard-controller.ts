import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useUsageData, useUploadData, useDeleteData } from '@/hooks/use-usage-data'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
import { useComputedMetrics } from '@/hooks/use-computed-metrics'
import { useToast } from '@/lib/toast'
import { applyTheme, DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { downloadCSV } from '@/lib/csv-export'
import { VERSION } from '@/lib/constants'
import {
  deleteSettings,
  generatePdfReport,
  importSettings,
  importUsageData,
  type PdfReportRequest,
} from '@/lib/api'
import {
  formatDateTimeCompact,
  formatDateTimeFull,
  localToday,
  toLocalDateStr,
} from '@/lib/formatters'
import { getCurrentLocale } from '@/lib/i18n'
import { getCurrentMonthForecastData } from '@/lib/data-transforms'
import { computeDashboardForecastState } from '@/lib/calculations'
import type {
  DashboardAutoImportDialogViewModel,
  DashboardCommandPaletteViewModel,
  DashboardDialogViewModel,
  DashboardDrillDownViewModel,
  DashboardEmptyStateViewModel,
  DashboardFilterBarViewModel,
  DashboardHeaderViewModel,
  DashboardLoadErrorViewModel,
  DashboardReportViewModel,
  DashboardSectionsViewModel,
  DashboardSettingsModalViewModel,
} from '@/lib/dashboard-view-model'
import { getUniqueModels, getUniqueProviders } from '@/lib/model-utils'
import type {
  AppLanguage,
  AppSettings,
  DashboardDatePreset,
  DashboardDefaultFilters,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ProviderLimits,
  ReducedMotionPreference,
} from '@/types'

const SETTINGS_BACKUP_KIND = 'ttdash-settings-backup'
const USAGE_BACKUP_KIND = 'ttdash-usage-backup'
const BACKUP_FORMAT_VERSION = 1
const CORRUPT_SETTINGS_MESSAGE = 'Settings file is unreadable or corrupted.'
const CORRUPT_USAGE_MESSAGE = 'Usage data file is unreadable or corrupted.'

/** Captures one JSON download emitted by the dashboard controller. */
export type JsonDownloadRecord = {
  filename: string
  mimeType: string
  size: number
  text: string
}

/** Exposes optional browser hooks used by frontend tests. */
export type DashboardTestHooks = {
  onJsonDownload?: (record: JsonDownloadRecord) => void
  openSettings?: () => void
}

/** Describes the hidden file inputs that back upload and import actions. */
export interface DashboardFileInputsViewModel {
  usageUploadRef: RefObject<HTMLInputElement | null>
  settingsImportRef: RefObject<HTMLInputElement | null>
  dataImportRef: RefObject<HTMLInputElement | null>
  onUsageUploadChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void
  onSettingsImportChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void
  onDataImportChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> | void
}

/** Describes the shell state that wraps the dashboard composition. */
export interface DashboardShellViewModel {
  isLoading: boolean
  settingsLoading: boolean
  hasData: boolean
  isDark: boolean
  animationKey: number
  modelPaletteModelNames: string[]
}

/** Groups the dashboard-owned modal and panel states. */
export interface DashboardDialogsViewModel {
  helpPanel: DashboardDialogViewModel
  autoImport: DashboardAutoImportDialogViewModel
  drillDown: DashboardDrillDownViewModel
}

/** Describes the full dashboard composition contract returned by the controller. */
export interface DashboardControllerViewModel {
  fileInputs: DashboardFileInputsViewModel
  shell: DashboardShellViewModel
  loadError: DashboardLoadErrorViewModel | null
  emptyState: DashboardEmptyStateViewModel
  header: DashboardHeaderViewModel
  report: DashboardReportViewModel
  filterBar: DashboardFilterBarViewModel
  sections: DashboardSectionsViewModel
  settingsModal: DashboardSettingsModalViewModel
  dialogs: DashboardDialogsViewModel
  commandPalette: DashboardCommandPaletteViewModel
}

function normalizeErrorMessage(error: unknown): string | null {
  return error instanceof Error && error.message.trim() ? error.message : null
}

function describeLoadError(message: string, fallback: string): string {
  if (message === CORRUPT_SETTINGS_MESSAGE) return fallback
  if (message === CORRUPT_USAGE_MESSAGE) return fallback
  return message
}

function downloadJsonFile(filename: string, data: unknown) {
  const text = JSON.stringify(data, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  const globalWindow = window as Window & {
    __TTDASH_TEST_HOOKS__?: DashboardTestHooks
  }
  globalWindow.__TTDASH_TEST_HOOKS__?.onJsonDownload?.({
    filename,
    mimeType: blob.type,
    size: blob.size,
    text,
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Creates the dashboard controller with default bootstrap settings. */
export function useDashboardController(
  initialSettingsError: string | null = null,
): DashboardControllerViewModel {
  return useDashboardControllerWithBootstrap(
    DEFAULT_APP_SETTINGS,
    false,
    null,
    initialSettingsError,
  )
}

/** Creates the full dashboard controller from bootstrap settings and live data. */
export function useDashboardControllerWithBootstrap(
  initialSettings: AppSettings,
  initialSettingsLoadedFromServer = false,
  initialSettingsFetchedAt: number | null = null,
  initialSettingsError: string | null = null,
): DashboardControllerViewModel {
  const { t, i18n } = useTranslation()
  const { data: usageData, isLoading, error: usageError } = useUsageData()
  const uploadMutation = useUploadData()
  const deleteMutation = useDeleteData()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const settingsImportInputRef = useRef<HTMLInputElement>(null)
  const dataImportInputRef = useRef<HTMLInputElement>(null)
  const [drillDownDate, setDrillDownDate] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [autoImportOpen, setAutoImportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reportGenerating, setReportGenerating] = useState(false)
  const [settingsTransferBusy, setSettingsTransferBusy] = useState(false)
  const [dataTransferBusy, setDataTransferBusy] = useState(false)
  const [dataSource, setDataSource] = useState<{
    type: 'stored' | 'auto-import' | 'file'
    label?: string
    time?: string
    title?: string
  } | null>(null)
  const [animationSeed, setAnimationSeed] = useState(0)
  const [bootstrapSettingsError, setBootstrapSettingsError] = useState(initialSettingsError)

  const daily = useMemo(() => usageData?.daily ?? [], [usageData])
  const hasData = daily.length > 0
  const allProviders = useMemo(
    () => getUniqueProviders(daily.map((entry) => entry.modelsUsed)),
    [daily],
  )
  const allModelsFromData = useMemo(
    () => getUniqueModels(daily.map((entry) => entry.modelsUsed)),
    [daily],
  )

  const {
    settings,
    providerLimits,
    setTheme,
    setLanguage,
    saveSettings,
    isSaving,
    isLoading: settingsLoading,
    error: settingsError,
    hasFetchedAfterMount,
  } = useAppSettings(
    allProviders,
    initialSettings,
    initialSettingsLoadedFromServer,
    initialSettingsFetchedAt,
  )
  const isDark = settings.theme === 'dark'

  useEffect(() => {
    if (bootstrapSettingsError && hasFetchedAfterMount && !settingsError) {
      setBootstrapSettingsError(null)
    }
  }, [bootstrapSettingsError, hasFetchedAfterMount, settingsError])

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    if (i18n.resolvedLanguage !== settings.language) {
      void i18n.changeLanguage(settings.language)
    }
  }, [i18n, settings.language])

  useEffect(() => {
    const globalWindow = window as Window & {
      __TTDASH_TEST_HOOKS__?: DashboardTestHooks
    }

    if (!globalWindow.__TTDASH_TEST_HOOKS__) {
      return undefined
    }

    globalWindow.__TTDASH_TEST_HOOKS__.openSettings = () => {
      setSettingsOpen(true)
    }

    return () => {
      if (globalWindow.__TTDASH_TEST_HOOKS__?.openSettings) {
        delete globalWindow.__TTDASH_TEST_HOOKS__.openSettings
      }
    }
  }, [])

  const persistedLoadedTime = useMemo(
    () => (settings.lastLoadedAt ? formatDateTimeCompact(settings.lastLoadedAt) : undefined),
    [settings.lastLoadedAt],
  )
  const persistedLoadedTitle = useMemo(
    () =>
      settings.lastLoadedAt
        ? t('header.loadedAt', { time: formatDateTimeFull(settings.lastLoadedAt) })
        : undefined,
    [settings.lastLoadedAt, t],
  )
  const persistedDataSource = useMemo(() => {
    if (!hasData) return null

    return {
      type: 'stored' as const,
      ...(persistedLoadedTime ? { time: persistedLoadedTime } : {}),
      ...(persistedLoadedTitle ? { title: persistedLoadedTitle } : {}),
    }
  }, [hasData, persistedLoadedTime, persistedLoadedTitle])
  const headerDataSource = dataSource ?? persistedDataSource
  const startupAutoLoadBadge = useMemo(
    () =>
      settings.cliAutoLoadActive
        ? {
            active: true,
            ...(persistedLoadedTime ? { time: persistedLoadedTime } : {}),
            title: settings.lastLoadedAt
              ? t('header.autoLoadAt', { time: formatDateTimeFull(settings.lastLoadedAt) })
              : t('header.autoLoadActive'),
          }
        : null,
    [settings.cliAutoLoadActive, settings.lastLoadedAt, persistedLoadedTime, t],
  )

  const filters = useDashboardFilters(daily, settings.defaultFilters)
  const {
    viewMode,
    setViewMode,
    selectedMonth,
    setSelectedMonth,
    selectedProviders,
    toggleProvider,
    clearProviders,
    selectedModels,
    toggleModel,
    clearModels,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    resetAll,
    applyDefaultFilters,
    applyPreset,
    filteredDailyData,
    filteredData,
    availableMonths,
    availableProviders,
    availableModels,
    dateRange,
  } = filters

  const computed = useComputedMetrics(filteredData, i18n.resolvedLanguage ?? i18n.language)
  const {
    metrics,
    modelCosts,
    providerMetrics,
    costChartData,
    modelCostChartData,
    tokenChartData,
    requestChartData,
    weekdayData,
    allModels,
    modelPieData,
    tokenPieData,
  } = computed

  const comparisonData = filteredDailyData
  const totalCalendarDays = useMemo(() => {
    if (!dateRange || viewMode !== 'daily') return 0
    const start = new Date(dateRange.start + 'T00:00:00')
    const end = new Date(dateRange.end + 'T00:00:00')
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [dateRange, viewMode])

  const todayStr = localToday()
  const todayData = useMemo(
    () => filteredDailyData.find((entry) => entry.date === todayStr) ?? null,
    [filteredDailyData, todayStr],
  )
  const hasCurrentMonthData = useMemo(
    () => filteredDailyData.some((entry) => entry.date.startsWith(todayStr.slice(0, 7))),
    [filteredDailyData, todayStr],
  )
  const visibleLimitProviders = useMemo(
    () => (selectedProviders.length > 0 ? selectedProviders : allProviders),
    [selectedProviders, allProviders],
  )
  const forecastData = useMemo(
    () => getCurrentMonthForecastData(daily, selectedProviders, selectedModels),
    [daily, selectedProviders, selectedModels],
  )
  const forecastState = useMemo(() => computeDashboardForecastState(forecastData), [forecastData])
  const settingsProviderOptions = useMemo(
    () =>
      [...new Set([...allProviders, ...settings.defaultFilters.providers])].sort((left, right) =>
        left.localeCompare(right),
      ),
    [allProviders, settings.defaultFilters.providers],
  )
  const settingsModelOptions = useMemo(
    () =>
      [...new Set([...allModelsFromData, ...settings.defaultFilters.models])].sort((left, right) =>
        left.localeCompare(right),
      ),
    [allModelsFromData, settings.defaultFilters.models],
  )
  const sectionVisibility = settings.sectionVisibility
  const sectionOrder = settings.sectionOrder

  const streak = useMemo(() => {
    const dates = new Set(filteredDailyData.map((entry) => entry.date))
    let count = 0
    const date = new Date(todayStr + 'T00:00:00')
    while (dates.has(toLocalDateStr(date))) {
      count += 1
      date.setDate(date.getDate() - 1)
    }
    return count
  }, [filteredDailyData, todayStr])

  const drillDownDay = useMemo(() => {
    if (!drillDownDate) return null
    return filteredData.find((entry) => entry.date === drillDownDate) ?? null
  }, [drillDownDate, filteredData])
  const drillDownSequence = useMemo(
    () => [...filteredData].sort((left, right) => left.date.localeCompare(right.date)),
    [filteredData],
  )
  const drillDownIndex = useMemo(
    () =>
      drillDownDate !== null
        ? drillDownSequence.findIndex((entry) => entry.date === drillDownDate)
        : -1,
    [drillDownDate, drillDownSequence],
  )
  const hasPreviousDrillDown = drillDownIndex > 0
  const hasNextDrillDown = drillDownIndex >= 0 && drillDownIndex < drillDownSequence.length - 1
  const filterBarModels = useMemo(
    () => Array.from(new Set([...availableModels, ...selectedModels])),
    [availableModels, selectedModels],
  )

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  const handleOpenHelp = useCallback(() => {
    setHelpOpen(true)
  }, [])

  const handleRetryLoad = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['settings'] }),
      queryClient.invalidateQueries({ queryKey: ['usage'] }),
    ])
  }, [queryClient])

  const handleResetSettings = useCallback(async () => {
    try {
      const nextSettings = await deleteSettings()
      queryClient.setQueryData<AppSettings>(['settings'], nextSettings)
      setBootstrapSettingsError(null)
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      addToast(t('toasts.settingsReset'), 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : t('api.deleteSettingsFailed'), 'error')
    }
  }, [queryClient, addToast, t])

  const handleToggleTheme = useCallback(() => {
    void setTheme(isDark ? 'light' : 'dark')
  }, [isDark, setTheme])

  const handleSaveSettings = useCallback(
    async (nextSettings: {
      language: AppLanguage
      reducedMotionPreference: ReducedMotionPreference
      providerLimits: ProviderLimits
      defaultFilters: DashboardDefaultFilters
      sectionVisibility: DashboardSectionVisibility
      sectionOrder: DashboardSectionOrder
    }) => {
      const updatedSettings = await saveSettings(nextSettings)
      applyDefaultFilters(updatedSettings.defaultFilters)
      addToast(t('toasts.settingsSaved'), 'success')
    },
    [saveSettings, applyDefaultFilters, addToast, t],
  )

  const handleLanguageChange = useCallback(
    (language: AppLanguage) => {
      if (settings.language !== language) {
        void setLanguage(language)
      }
      if (i18n.resolvedLanguage !== language) {
        void i18n.changeLanguage(language)
      }
    },
    [i18n, setLanguage, settings.language],
  )

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const parsed: unknown = JSON.parse(await file.text())
        try {
          await uploadMutation.mutateAsync(parsed)
        } catch (error) {
          addToast(normalizeErrorMessage(error) ?? t('toasts.fileReadFailed'), 'error')
          return
        }
        void queryClient.invalidateQueries({ queryKey: ['settings'] })
        setAnimationSeed((previous) => previous + 1)
        const now = new Date()
        const time = now.toLocaleTimeString(getCurrentLocale(), {
          hour: '2-digit',
          minute: '2-digit',
        })
        setDataSource({
          type: 'file',
          label: file.name,
          time,
          title: `${file.name} · ${t('header.loadedAt', { time: formatDateTimeFull(now.toISOString()) })}`,
        })
        addToast(t('toasts.fileLoaded', { name: file.name }), 'success')
      } catch {
        addToast(t('toasts.fileReadFailed'), 'error')
      }

      event.target.value = ''
    },
    [uploadMutation, queryClient, addToast, t],
  )

  const handleDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync()
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      setAnimationSeed((previous) => previous + 1)
      setDataSource(null)
      addToast(t('toasts.dataDeleted'), 'info')
    } catch (error) {
      addToast(normalizeErrorMessage(error) ?? t('toasts.deleteFailed'), 'error')
    }
  }, [deleteMutation, queryClient, addToast, t])

  const settingsErrorMessage =
    bootstrapSettingsError ?? normalizeErrorMessage(settingsError) ?? null
  const usageErrorMessage = normalizeErrorMessage(usageError)
  const fatalLoadState = useMemo(() => {
    const details: string[] = []
    const hasSettingsError = Boolean(settingsErrorMessage)
    const hasUsageError = Boolean(usageErrorMessage)

    if (settingsErrorMessage) {
      details.push(describeLoadError(settingsErrorMessage, t('loadError.settingsCorrupted')))
    }

    if (usageErrorMessage) {
      details.push(describeLoadError(usageErrorMessage, t('loadError.usageCorrupted')))
    }

    if (!hasSettingsError && !hasUsageError) {
      return null
    }

    return {
      title: t('loadError.title'),
      description:
        hasSettingsError && hasUsageError
          ? t('loadError.multipleDescription')
          : hasSettingsError
            ? t('loadError.settingsDescription')
            : t('loadError.usageDescription'),
      details,
      canResetSettings: hasSettingsError,
      canResetUsage: hasUsageError,
    }
  }, [settingsErrorMessage, usageErrorMessage, t])

  const handleExportCSV = useCallback(() => {
    downloadCSV(filteredData)
    addToast(t('toasts.csvExported'), 'success')
  }, [filteredData, addToast, t])

  const handleDrillDownPrevious = useCallback(() => {
    if (!hasPreviousDrillDown) return
    setDrillDownDate(drillDownSequence[drillDownIndex - 1]?.date ?? null)
  }, [drillDownIndex, drillDownSequence, hasPreviousDrillDown])

  const handleDrillDownNext = useCallback(() => {
    if (!hasNextDrillDown) return
    setDrillDownDate(drillDownSequence[drillDownIndex + 1]?.date ?? null)
  }, [drillDownIndex, drillDownSequence, hasNextDrillDown])

  const handleDrillDownClose = useCallback(() => {
    setDrillDownDate(null)
  }, [])

  const handleGenerateReport = useCallback(async () => {
    if (reportGenerating) return
    setReportGenerating(true)

    try {
      const requestLanguage: PdfReportRequest['language'] = i18n.language === 'en' ? 'en' : 'de'
      const request: PdfReportRequest = {
        viewMode,
        selectedMonth,
        selectedProviders,
        selectedModels,
        language: requestLanguage,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      }
      const blob = await generatePdfReport(request)
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `ttdash-report-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      addToast(t('commandPalette.commands.generateReport.label'), 'success')
    } catch (error) {
      console.error('PDF generation failed:', error)
      addToast(
        `${t('api.pdfFailed')}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      )
    } finally {
      setReportGenerating(false)
    }
  }, [
    reportGenerating,
    viewMode,
    selectedMonth,
    selectedProviders,
    selectedModels,
    startDate,
    endDate,
    addToast,
    i18n.language,
    t,
  ])

  const handleAutoImport = useCallback(() => {
    setAutoImportOpen(true)
  }, [])

  const handleAutoImportSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['usage'] })
    void queryClient.invalidateQueries({ queryKey: ['settings'] })
    setAnimationSeed((previous) => previous + 1)
    const now = new Date()
    const time = now.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' })
    setDataSource({
      type: 'auto-import',
      ...(time ? { time } : {}),
      title: t('header.loadedAt', { time: formatDateTimeFull(now.toISOString()) }),
    })
    addToast(t('toasts.dataImported'), 'success')
  }, [queryClient, addToast, t])

  const handleExportSettings = useCallback(() => {
    downloadJsonFile(`ttdash-settings-backup-${localToday()}.json`, {
      kind: SETTINGS_BACKUP_KIND,
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: VERSION,
      settings: {
        language: settings.language,
        theme: settings.theme,
        reducedMotionPreference: settings.reducedMotionPreference,
        providerLimits: settings.providerLimits,
        defaultFilters: settings.defaultFilters,
        sectionVisibility: settings.sectionVisibility,
        sectionOrder: settings.sectionOrder,
        lastLoadedAt: settings.lastLoadedAt,
        lastLoadSource: settings.lastLoadSource,
      },
    })
    addToast(t('toasts.settingsExported'), 'success')
  }, [settings, addToast, t])

  const handleExportData = useCallback(() => {
    if (!usageData || usageData.daily.length === 0) {
      addToast(t('toasts.noDataToExport'), 'info')
      return
    }

    downloadJsonFile(`ttdash-data-backup-${localToday()}.json`, {
      kind: USAGE_BACKUP_KIND,
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: VERSION,
      data: usageData,
    })
    addToast(t('toasts.dataExported'), 'success')
  }, [usageData, addToast, t])

  const handleImportSettings = useCallback(() => {
    settingsImportInputRef.current?.click()
  }, [])

  const handleImportData = useCallback(() => {
    dataImportInputRef.current?.click()
  }, [])

  const handleSettingsImportChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setSettingsTransferBusy(true)
      try {
        const parsed: unknown = JSON.parse(await file.text())
        const imported = await importSettings(parsed)
        queryClient.setQueryData(['settings'], imported)
        applyDefaultFilters(imported.defaultFilters)
        addToast(t('toasts.settingsImported', { name: file.name }), 'success')
      } catch (error) {
        addToast(error instanceof Error ? error.message : t('toasts.fileReadFailed'), 'error')
      } finally {
        setSettingsTransferBusy(false)
        event.target.value = ''
      }
    },
    [queryClient, applyDefaultFilters, addToast, t],
  )

  const handleDataImportChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setDataTransferBusy(true)
      try {
        const parsed: unknown = JSON.parse(await file.text())
        const summary = await importUsageData(parsed)
        await queryClient.invalidateQueries({ queryKey: ['usage'] })
        await queryClient.invalidateQueries({ queryKey: ['settings'] })
        setAnimationSeed((previous) => previous + 1)
        const now = new Date()
        const time = now.toLocaleTimeString(getCurrentLocale(), {
          hour: '2-digit',
          minute: '2-digit',
        })
        setDataSource({
          type: 'file',
          label: file.name,
          ...(time ? { time } : {}),
          title: `${file.name} · ${t('header.loadedAt', { time: formatDateTimeFull(now.toISOString()) })}`,
        })

        const toastType: 'info' | 'success' = summary.conflictingDays > 0 ? 'info' : 'success'
        const toastKey =
          summary.conflictingDays > 0
            ? 'toasts.dataBackupImportedWithConflicts'
            : 'toasts.dataBackupImported'

        addToast(
          t(toastKey, {
            added: summary.addedDays,
            unchanged: summary.unchangedDays,
            conflicts: summary.conflictingDays,
          }),
          toastType,
        )
      } catch (error) {
        addToast(error instanceof Error ? error.message : t('toasts.fileReadFailed'), 'error')
      } finally {
        setDataTransferBusy(false)
        event.target.value = ''
      }
    },
    [queryClient, addToast, t],
  )

  const handleScrollTo = useCallback((section: string) => {
    const element = document.getElementById(section)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleClearDateRange = useCallback(() => {
    setStartDate(undefined)
    setEndDate(undefined)
  }, [setStartDate, setEndDate])

  const handleApplyPreset = useCallback(
    (preset: DashboardDatePreset) => {
      applyPreset(preset)
    },
    [applyPreset],
  )

  const loadError = useMemo<DashboardLoadErrorViewModel | null>(() => {
    if (!fatalLoadState) return null

    return {
      title: fatalLoadState.title,
      description: fatalLoadState.description,
      details: fatalLoadState.details,
      detailLabel: t('loadError.details'),
      actions: [
        {
          label: t('loadError.retry'),
          onClick: () => void handleRetryLoad(),
          variant: 'default',
        },
        ...(fatalLoadState.canResetSettings
          ? [{ label: t('loadError.resetSettings'), onClick: () => void handleResetSettings() }]
          : []),
        ...(fatalLoadState.canResetUsage
          ? [{ label: t('loadError.deleteData'), onClick: () => void handleDelete() }]
          : []),
      ],
    }
  }, [fatalLoadState, handleDelete, handleResetSettings, handleRetryLoad, t])

  return {
    fileInputs: {
      usageUploadRef: fileInputRef,
      settingsImportRef: settingsImportInputRef,
      dataImportRef: dataImportInputRef,
      onUsageUploadChange: handleFileChange,
      onSettingsImportChange: handleSettingsImportChange,
      onDataImportChange: handleDataImportChange,
    },
    shell: {
      isLoading,
      settingsLoading,
      hasData,
      isDark,
      animationKey: animationSeed,
      modelPaletteModelNames: allModelsFromData,
    },
    loadError,
    emptyState: {
      onUpload: handleUpload,
      onAutoImport: handleAutoImport,
      onOpenSettings: handleOpenSettings,
    },
    header: {
      dateRange,
      isDark,
      currentLanguage: settings.language,
      streak,
      dataSource: headerDataSource,
      startupAutoLoad: startupAutoLoadBadge,
      onHelpOpenChange: setHelpOpen,
      onLanguageChange: handleLanguageChange,
      onToggleTheme: handleToggleTheme,
      onExportCSV: handleExportCSV,
      onDelete: () => void handleDelete(),
      onUpload: handleUpload,
      onAutoImport: handleAutoImport,
    },
    report: {
      generating: reportGenerating,
      onGenerate: handleGenerateReport,
    },
    filterBar: {
      viewMode,
      onViewModeChange: setViewMode,
      selectedMonth,
      onMonthChange: setSelectedMonth,
      availableMonths,
      availableProviders,
      selectedProviders,
      onToggleProvider: toggleProvider,
      onClearProviders: clearProviders,
      allModels: filterBarModels,
      selectedModels,
      onToggleModel: toggleModel,
      onClearModels: clearModels,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      onStartDateChange: setStartDate,
      onEndDateChange: setEndDate,
      onApplyPreset: handleApplyPreset,
      onResetAll: resetAll,
    },
    sections: {
      layout: {
        sectionOrder,
        sectionVisibility,
      },
      overview: {
        metrics,
        viewMode,
        totalCalendarDays,
        filteredData,
        filteredDailyData,
        todayData,
        hasCurrentMonthData,
        isDark,
      },
      forecast: {
        filteredData,
        forecastState,
        metrics,
        viewMode,
      },
      limits: {
        filteredDailyData,
        visibleLimitProviders,
        providerLimits,
        selectedMonth,
      },
      costAnalysis: {
        filteredData,
        forecastState,
        allModels,
        costChartData,
        modelPieData,
        modelCostChartData,
        weekdayData,
      },
      tokenAnalysis: {
        tokenChartData,
        tokenPieData,
      },
      requestAnalysis: {
        metrics,
        requestChartData,
        filteredData,
        filteredDailyData,
        viewMode,
      },
      advancedAnalysis: {
        metrics,
        filteredData,
        viewMode,
      },
      comparisons: {
        metrics,
        filteredData,
        comparisonData,
        viewMode,
      },
      tables: {
        metrics,
        filteredData,
        modelCosts,
        providerMetrics,
        viewMode,
      },
      interactions: {
        onDrillDownDateChange: setDrillDownDate,
      },
    },
    settingsModal: {
      open: settingsOpen,
      onOpenChange: setSettingsOpen,
      language: settings.language,
      reducedMotionPreference: settings.reducedMotionPreference,
      limitProviders: allProviders,
      filterProviders: settingsProviderOptions,
      models: settingsModelOptions,
      limits: settings.providerLimits,
      defaultFilters: settings.defaultFilters,
      sectionVisibility: settings.sectionVisibility,
      sectionOrder: settings.sectionOrder,
      lastLoadedAt: settings.lastLoadedAt,
      lastLoadSource: settings.lastLoadSource,
      cliAutoLoadActive: settings.cliAutoLoadActive,
      hasData,
      onSaveSettings: handleSaveSettings,
      onExportSettings: handleExportSettings,
      onImportSettings: handleImportSettings,
      onExportData: handleExportData,
      onImportData: handleImportData,
      settingsBusy: settingsTransferBusy || isSaving,
      dataBusy: dataTransferBusy,
    },
    dialogs: {
      helpPanel: {
        open: helpOpen,
        onOpenChange: setHelpOpen,
      },
      autoImport: {
        open: autoImportOpen,
        onOpenChange: setAutoImportOpen,
        onSuccess: handleAutoImportSuccess,
      },
      drillDown: {
        day: drillDownDay,
        contextData: filteredData,
        open: drillDownDate !== null,
        hasPrevious: hasPreviousDrillDown,
        hasNext: hasNextDrillDown,
        currentIndex: drillDownIndex >= 0 ? drillDownIndex + 1 : 0,
        totalCount: drillDownSequence.length,
        onPrevious: handleDrillDownPrevious,
        onNext: handleDrillDownNext,
        onClose: handleDrillDownClose,
      },
    },
    commandPalette: {
      isDark,
      availableProviders,
      selectedProviders,
      availableModels,
      selectedModels,
      hasTodaySection: Boolean(todayData),
      hasMonthSection: hasCurrentMonthData,
      hasRequestSection: metrics.hasRequestData,
      sectionVisibility,
      sectionOrder,
      reportGenerating,
      onToggleTheme: handleToggleTheme,
      onExportCSV: handleExportCSV,
      onGenerateReport: () => void handleGenerateReport(),
      onDelete: () => void handleDelete(),
      onUpload: handleUpload,
      onAutoImport: handleAutoImport,
      onOpenSettings: handleOpenSettings,
      onScrollTo: handleScrollTo,
      onViewModeChange: setViewMode,
      onApplyPreset: handleApplyPreset,
      onToggleProvider: toggleProvider,
      onToggleModel: toggleModel,
      onClearProviders: clearProviders,
      onClearModels: clearModels,
      onClearDateRange: handleClearDateRange,
      onResetAll: resetAll,
      onHelp: handleOpenHelp,
      onLanguageChange: handleLanguageChange,
    },
  }
}
