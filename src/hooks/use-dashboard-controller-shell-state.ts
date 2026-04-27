import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { formatDateTimeCompact, formatDateTimeFull } from '@/lib/formatters'
import type {
  DashboardDataSource,
  DashboardLoadErrorViewModel,
  DashboardStartupAutoLoadBadge,
} from '@/types/dashboard-view-model'
import type { AppSettings } from '@/types'

const CORRUPT_SETTINGS_MESSAGE = 'Settings file is unreadable or corrupted.'
const CORRUPT_USAGE_MESSAGE = 'Usage data file is unreadable or corrupted.'

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

function describeLoadError(message: string, fallback: string): string {
  if (message === CORRUPT_SETTINGS_MESSAGE) return fallback
  if (message === CORRUPT_USAGE_MESSAGE) return fallback
  return message
}

/** Declares the inputs that shape the dashboard shell badges and load error state. */
interface DashboardControllerShellStateParams {
  settings: AppSettings
  hasData: boolean
  dataSource: DashboardDataSource | null
  bootstrapSettingsError: string | null
  settingsError: unknown
  usageError: unknown
  t: TFunction
  onRetryLoad: () => Promise<void>
  onResetSettings: () => Promise<void>
  onDelete: () => Promise<void>
}

/** Collects the shell-level dashboard badges and fatal-load view model. */
export interface DashboardControllerShellState {
  headerDataSource: DashboardDataSource | null
  startupAutoLoadBadge: DashboardStartupAutoLoadBadge | null
  loadError: DashboardLoadErrorViewModel | null
}

/** Builds load-error and persisted badge state for the dashboard shell. */
export function useDashboardControllerShellState({
  settings,
  hasData,
  dataSource,
  bootstrapSettingsError,
  settingsError,
  usageError,
  t,
  onRetryLoad,
  onResetSettings,
  onDelete,
}: DashboardControllerShellStateParams): DashboardControllerShellState {
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

  const persistedDataSource = useMemo<DashboardDataSource | null>(() => {
    if (!hasData) return null

    return {
      type: 'stored',
      ...(persistedLoadedTime ? { time: persistedLoadedTime } : {}),
      ...(persistedLoadedTitle ? { title: persistedLoadedTitle } : {}),
    }
  }, [hasData, persistedLoadedTime, persistedLoadedTitle])

  const startupAutoLoadBadge = useMemo<DashboardStartupAutoLoadBadge | null>(
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
          onClick: () => void onRetryLoad(),
          variant: 'default',
        },
        ...(fatalLoadState.canResetSettings
          ? [{ label: t('loadError.resetSettings'), onClick: () => void onResetSettings() }]
          : []),
        ...(fatalLoadState.canResetUsage
          ? [{ label: t('loadError.deleteData'), onClick: () => void onDelete() }]
          : []),
      ],
    }
  }, [fatalLoadState, onDelete, onResetSettings, onRetryLoad, t])

  return {
    headerDataSource: dataSource ?? persistedDataSource,
    startupAutoLoadBadge,
    loadError,
  }
}
