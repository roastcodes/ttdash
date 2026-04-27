import { useCallback, useRef, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { TFunction, i18n as I18n } from 'i18next'
import {
  deleteSettings,
  generatePdfReport,
  importSettings,
  importUsageData,
  type PdfReportRequest,
} from '@/lib/api'
import {
  downloadBlobFile,
  downloadJsonFile,
  scrollToSection,
} from '@/hooks/use-dashboard-controller-browser'
import type {
  DashboardDataSource,
  DashboardHeaderViewModel,
  DashboardReportViewModel,
  DashboardSettingsModalViewModel,
} from '@/types/dashboard-view-model'
import { VERSION } from '@/lib/constants'
import { formatDateTimeFull, localToday } from '@/lib/formatters'
import { getCurrentLocale } from '@/lib/i18n'
import type {
  DashboardFileInputChangeEvent,
  DashboardFileInputsViewModel,
} from '@/types/dashboard-controller'
import type {
  AppLanguage,
  AppSettings,
  DashboardDatePreset,
  DashboardDefaultFilters,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ProviderLimits,
  ReducedMotionPreference,
  UsageData,
} from '@/types'

/** Declares the dependencies that power the dashboard controller action slice. */
interface DashboardControllerActionsParams {
  settings: AppSettings
  usageData: UsageData | undefined
  isDark: boolean
  viewMode: PdfReportRequest['viewMode']
  selectedMonth: string | null
  selectedProviders: string[]
  selectedModels: string[]
  startDate?: string
  endDate?: string
  setStartDate: (date: string | undefined) => void
  setEndDate: (date: string | undefined) => void
  applyDefaultFilters: (filters: DashboardDefaultFilters) => void
  applyPreset: (preset: DashboardDatePreset) => void
  setTheme: (theme: AppSettings['theme']) => Promise<unknown>
  setLanguage: (language: AppLanguage) => Promise<unknown>
  saveSettings: (settings: {
    language: AppLanguage
    reducedMotionPreference: ReducedMotionPreference
    providerLimits: ProviderLimits
    defaultFilters: DashboardDefaultFilters
    sectionVisibility: DashboardSectionVisibility
    sectionOrder: DashboardSectionOrder
  }) => Promise<AppSettings>
  isSaving: boolean
  queryClient: QueryClient
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void
  t: TFunction
  i18n: I18n
  uploadUsageData: (data: unknown) => Promise<unknown>
  deleteUsageData: () => Promise<unknown>
  onClearBootstrapSettingsError: () => void
}

/** Collects the imperative action handlers emitted by the dashboard action slice. */
export interface DashboardControllerActionsResult {
  fileInputs: DashboardFileInputsViewModel
  report: DashboardReportViewModel
  dataSource: DashboardDataSource | null
  animationKey: number
  settingsBusy: boolean
  dataBusy: boolean
  onUpload: () => void
  onRetryLoad: () => Promise<void>
  onResetSettings: () => Promise<void>
  onToggleTheme: () => void
  onSaveSettings: DashboardSettingsModalViewModel['onSaveSettings']
  onLanguageChange: DashboardHeaderViewModel['onLanguageChange']
  onDelete: () => Promise<void>
  onAutoImportSuccess: () => void
  onExportSettings: () => void
  onImportSettings: () => void
  onExportData: () => void
  onImportData: () => void
  onClearDateRange: () => void
  onApplyPreset: (preset: DashboardDatePreset) => void
  onScrollTo: (section: string) => void
}

function normalizeErrorMessage(error: unknown): string | null {
  return error instanceof Error && error.message.trim() ? error.message : null
}

function createLoadedTime(now: Date) {
  return now.toLocaleTimeString(getCurrentLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Owns the dashboard's imperative actions, browser IO, and transient transfer state. */
export function useDashboardControllerActions({
  settings,
  usageData,
  isDark,
  viewMode,
  selectedMonth,
  selectedProviders,
  selectedModels,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  applyDefaultFilters,
  applyPreset,
  setTheme,
  setLanguage,
  saveSettings,
  isSaving,
  queryClient,
  addToast,
  t,
  i18n,
  uploadUsageData,
  deleteUsageData,
  onClearBootstrapSettingsError,
}: DashboardControllerActionsParams): DashboardControllerActionsResult {
  const usageUploadRef = useRef<HTMLInputElement>(null)
  const settingsImportRef = useRef<HTMLInputElement>(null)
  const dataImportRef = useRef<HTMLInputElement>(null)
  const [reportGenerating, setReportGenerating] = useState(false)
  const [settingsTransferBusy, setSettingsTransferBusy] = useState(false)
  const [dataTransferBusy, setDataTransferBusy] = useState(false)
  const [dataSource, setDataSource] = useState<DashboardDataSource | null>(null)
  const [animationKey, setAnimationKey] = useState(0)

  const handleUpload = useCallback(() => {
    usageUploadRef.current?.click()
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
      onClearBootstrapSettingsError()
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      addToast(t('toasts.settingsReset'), 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : t('api.deleteSettingsFailed'), 'error')
    }
  }, [queryClient, onClearBootstrapSettingsError, addToast, t])

  const handleToggleTheme = useCallback(() => {
    void setTheme(isDark ? 'light' : 'dark')
  }, [isDark, setTheme])

  const handleSaveSettings = useCallback<DashboardSettingsModalViewModel['onSaveSettings']>(
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

  const handleLanguageChange = useCallback<DashboardHeaderViewModel['onLanguageChange']>(
    (language) => {
      if (settings.language !== language) {
        void setLanguage(language)
      }
      if (i18n.resolvedLanguage !== language) {
        void i18n.changeLanguage(language)
      }
    },
    [i18n, setLanguage, settings.language],
  )

  const handleUsageUploadChange = useCallback(
    async (event: DashboardFileInputChangeEvent) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const parsed: unknown = JSON.parse(await file.text())

        try {
          await uploadUsageData(parsed)
        } catch (error) {
          addToast(normalizeErrorMessage(error) ?? t('api.uploadFailed'), 'error')
          return
        }

        void queryClient.invalidateQueries({ queryKey: ['settings'] })
        setAnimationKey((previous) => previous + 1)
        const now = new Date()
        const time = createLoadedTime(now)
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
    [uploadUsageData, queryClient, addToast, t],
  )

  const handleDelete = useCallback(async () => {
    try {
      await deleteUsageData()
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      setAnimationKey((previous) => previous + 1)
      setDataSource(null)
      addToast(t('toasts.dataDeleted'), 'info')
    } catch (error) {
      addToast(normalizeErrorMessage(error) ?? t('toasts.deleteFailed'), 'error')
    }
  }, [deleteUsageData, queryClient, addToast, t])

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
      downloadBlobFile(`ttdash-report-${new Date().toISOString().slice(0, 10)}.pdf`, blob)
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

  const handleAutoImportSuccess = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['usage'] })
    void queryClient.invalidateQueries({ queryKey: ['settings'] })
    setAnimationKey((previous) => previous + 1)
    const now = new Date()
    const time = createLoadedTime(now)
    setDataSource({
      type: 'auto-import',
      ...(time ? { time } : {}),
      title: t('header.loadedAt', { time: formatDateTimeFull(now.toISOString()) }),
    })
    addToast(t('toasts.dataImported'), 'success')
  }, [queryClient, addToast, t])

  const handleExportSettings = useCallback(() => {
    downloadJsonFile(`ttdash-settings-backup-${localToday()}.json`, {
      kind: 'ttdash-settings-backup',
      version: 1,
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
      kind: 'ttdash-usage-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      appVersion: VERSION,
      data: usageData,
    })
    addToast(t('toasts.dataExported'), 'success')
  }, [usageData, addToast, t])

  const handleImportSettings = useCallback(() => {
    settingsImportRef.current?.click()
  }, [])

  const handleImportData = useCallback(() => {
    dataImportRef.current?.click()
  }, [])

  const handleSettingsImportChange = useCallback(
    async (event: DashboardFileInputChangeEvent) => {
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
    async (event: DashboardFileInputChangeEvent) => {
      const file = event.target.files?.[0]
      if (!file) return

      setDataTransferBusy(true)
      try {
        const parsed: unknown = JSON.parse(await file.text())
        const summary = await importUsageData(parsed)
        await queryClient.invalidateQueries({ queryKey: ['usage'] })
        await queryClient.invalidateQueries({ queryKey: ['settings'] })
        setAnimationKey((previous) => previous + 1)
        const now = new Date()
        const time = createLoadedTime(now)
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

  return {
    fileInputs: {
      usageUploadRef,
      settingsImportRef,
      dataImportRef,
      onUsageUploadChange: handleUsageUploadChange,
      onSettingsImportChange: handleSettingsImportChange,
      onDataImportChange: handleDataImportChange,
    },
    report: {
      generating: reportGenerating,
      onGenerate: handleGenerateReport,
    },
    dataSource,
    animationKey,
    settingsBusy: settingsTransferBusy || isSaving,
    dataBusy: dataTransferBusy,
    onUpload: handleUpload,
    onRetryLoad: handleRetryLoad,
    onResetSettings: handleResetSettings,
    onToggleTheme: handleToggleTheme,
    onSaveSettings: handleSaveSettings,
    onLanguageChange: handleLanguageChange,
    onDelete: handleDelete,
    onAutoImportSuccess: handleAutoImportSuccess,
    onExportSettings: handleExportSettings,
    onImportSettings: handleImportSettings,
    onExportData: handleExportData,
    onImportData: handleImportData,
    onClearDateRange: handleClearDateRange,
    onApplyPreset: handleApplyPreset,
    onScrollTo: scrollToSection,
  }
}
