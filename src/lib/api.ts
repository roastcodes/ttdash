import type {
  AppSettings,
  AppLanguage,
  AppTheme,
  DashboardDefaultFilters,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ProviderLimits,
  ReducedMotionPreference,
  ToktrackVersionStatus,
  UsageData,
  UsageImportSummary,
  ViewMode,
} from '@/types'
import i18n from '@/lib/i18n'
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from '@/lib/app-settings'

interface ApiErrorPayload {
  message?: string
}

async function parseResponseJson<T>(response: Response): Promise<T> {
  const data: unknown = await response.json()
  return data as T
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await parseResponseJson<ApiErrorPayload>(response)
    return typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : fallback
  } catch {
    return fallback
  }
}

/** Describes the bootstrap settings payload returned before the first render. */
export interface BootstrapSettingsResult {
  settings: AppSettings
  errorMessage: string | null
  loadedFromServer: boolean
  fetchedAt: number | null
}

/** Loads the persisted usage dataset from the local API. */
export async function fetchUsage(): Promise<UsageData> {
  const res = await fetch('/api/usage')
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.fetchUsageFailed')))
  }
  return parseResponseJson<UsageData>(res)
}

/** Uploads a full usage payload to the local API. */
export async function uploadData(data: unknown): Promise<{ days: number; totalCost: number }> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.uploadFailed')))
  }
  return parseResponseJson<{ days: number; totalCost: number }>(res)
}

/** Deletes the persisted usage dataset from the local API. */
export async function deleteUsage(): Promise<void> {
  const res = await fetch('/api/usage', { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('api.deleteFailed'))
}

/** Imports usage data by merging it into the existing dataset. */
export async function importUsageData(data: unknown): Promise<UsageImportSummary> {
  const res = await fetch('/api/usage/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.importUsageFailed')))
  }
  return parseResponseJson<UsageImportSummary>(res)
}

/** Describes a partial settings update sent to the local API. */
export interface UpdateSettingsRequest {
  language?: AppLanguage
  theme?: AppTheme
  reducedMotionPreference?: ReducedMotionPreference
  providerLimits?: ProviderLimits
  defaultFilters?: DashboardDefaultFilters
  sectionVisibility?: DashboardSectionVisibility
  sectionOrder?: DashboardSectionOrder
}

/** Loads persisted app settings from the local API. */
export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch('/api/settings')
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.fetchSettingsFailed')))
  }
  return normalizeAppSettings(await parseResponseJson<unknown>(res))
}

/** Loads bootstrap settings for the first app render. */
export async function loadBootstrapSettings(): Promise<BootstrapSettingsResult> {
  try {
    const fetchedAt = Date.now()
    const response = await fetch('/api/settings')

    if (!response.ok) {
      return {
        settings: DEFAULT_APP_SETTINGS,
        errorMessage: await readErrorMessage(response, i18n.t('api.fetchSettingsFailed')),
        loadedFromServer: false,
        fetchedAt: null,
      }
    }

    return {
      settings: normalizeAppSettings(await parseResponseJson<unknown>(response)),
      errorMessage: null,
      loadedFromServer: true,
      fetchedAt,
    }
  } catch {
    return {
      settings: DEFAULT_APP_SETTINGS,
      errorMessage: null,
      loadedFromServer: false,
      fetchedAt: null,
    }
  }
}

/** Persists a partial settings update through the local API. */
export async function updateSettings(patch: UpdateSettingsRequest): Promise<AppSettings> {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.saveSettingsFailed')))
  }
  return normalizeAppSettings(await parseResponseJson<unknown>(res))
}

/** Resets persisted settings and returns the normalized defaults. */
export async function deleteSettings(): Promise<AppSettings> {
  const res = await fetch('/api/settings', { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.deleteSettingsFailed')))
  }

  const payload = await parseResponseJson<{ settings?: unknown }>(res)
  return normalizeAppSettings(payload.settings)
}

/** Imports a settings backup through the local API. */
export async function importSettings(data: unknown): Promise<AppSettings> {
  const res = await fetch('/api/settings/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.importSettingsFailed')))
  }
  return normalizeAppSettings(await parseResponseJson<unknown>(res))
}

/** Loads the pinned toktrack version and current latest-version status. */
export async function fetchToktrackVersionStatus(): Promise<ToktrackVersionStatus> {
  const res = await fetch('/api/toktrack/version-status')
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.fetchToktrackVersionFailed')))
  }
  return parseResponseJson<ToktrackVersionStatus>(res)
}

/** Describes the dashboard state required to build a PDF report. */
export interface PdfReportRequest {
  viewMode: ViewMode
  selectedMonth: string | null
  selectedProviders: string[]
  selectedModels: string[]
  startDate?: string
  endDate?: string
  language?: 'de' | 'en'
}

/** Requests a PDF report for the current dashboard state. */
export async function generatePdfReport(request: PdfReportRequest): Promise<Blob> {
  const res = await fetch('/api/report/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.pdfFailed')))
  }

  return res.blob()
}
