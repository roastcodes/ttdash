import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useUsageData, useUploadData, useDeleteData } from '@/hooks/use-usage-data'
import { useAppSettings } from '@/hooks/use-app-settings'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'
import { useComputedMetrics } from '@/hooks/use-computed-metrics'
import { useToast } from '@/components/ui/toast'
import { applyTheme } from '@/lib/app-settings'
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
import { getUniqueModels, getUniqueProviders } from '@/lib/model-utils'
import type {
  AppLanguage,
  AppSettings,
  DashboardDefaultFilters,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ProviderLimits,
} from '@/types'

const SETTINGS_BACKUP_KIND = 'ttdash-settings-backup'
const USAGE_BACKUP_KIND = 'ttdash-usage-backup'
const BACKUP_FORMAT_VERSION = 1
const CORRUPT_SETTINGS_MESSAGE = 'Settings file is unreadable or corrupted.'
const CORRUPT_USAGE_MESSAGE = 'Usage data file is unreadable or corrupted.'

export type JsonDownloadRecord = {
  filename: string
  mimeType: string
  size: number
  text: string
}

export type DashboardTestHooks = {
  onJsonDownload?: (record: JsonDownloadRecord) => void
  openSettings?: () => void
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

export function useDashboardController(initialSettingsError: string | null = null) {
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
  } = useAppSettings(allProviders)
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

  const computed = useComputedMetrics(filteredData)
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

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true)
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
        await uploadMutation.mutateAsync(parsed)
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
    await deleteMutation.mutateAsync()
    void queryClient.invalidateQueries({ queryKey: ['settings'] })
    setAnimationSeed((previous) => previous + 1)
    setDataSource(null)
    addToast(t('toasts.dataDeleted'), 'info')
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

  return {
    fileInputRef,
    settingsImportInputRef,
    dataImportInputRef,
    settings,
    providerLimits,
    isLoading,
    settingsLoading,
    isSaving,
    isDark,
    hasData,
    helpOpen,
    setHelpOpen,
    autoImportOpen,
    setAutoImportOpen,
    settingsOpen,
    setSettingsOpen,
    drillDownDate,
    setDrillDownDate,
    drillDownDay,
    reportGenerating,
    settingsTransferBusy,
    dataTransferBusy,
    dataSource,
    headerDataSource,
    startupAutoLoadBadge,
    animationSeed,
    daily,
    usageData,
    allProviders,
    allModelsFromData,
    settingsProviderOptions,
    settingsModelOptions,
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
    applyPreset,
    filteredDailyData,
    filteredData,
    availableMonths,
    availableProviders,
    availableModels,
    dateRange,
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
    comparisonData,
    totalCalendarDays,
    todayData,
    hasCurrentMonthData,
    visibleLimitProviders,
    sectionVisibility,
    sectionOrder,
    streak,
    fatalLoadState,
    handleUpload,
    handleOpenSettings,
    handleRetryLoad,
    handleResetSettings,
    handleToggleTheme,
    handleSaveSettings,
    handleLanguageChange,
    handleFileChange,
    handleDelete,
    handleExportCSV,
    handleGenerateReport,
    handleAutoImport,
    handleAutoImportSuccess,
    handleExportSettings,
    handleExportData,
    handleImportSettings,
    handleImportData,
    handleSettingsImportChange,
    handleDataImportChange,
    handleScrollTo,
  }
}
