import type {
  AppSettings,
  AppLanguage,
  AppTheme,
  DashboardDefaultFilters,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ProviderLimits,
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

export interface BootstrapSettingsResult {
  settings: AppSettings
  errorMessage: string | null
  loadedFromServer: boolean
}

export async function fetchUsage(): Promise<UsageData> {
  const res = await fetch('/api/usage')
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.fetchUsageFailed')))
  }
  return parseResponseJson<UsageData>(res)
}

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

export async function deleteUsage(): Promise<void> {
  const res = await fetch('/api/usage', { method: 'DELETE' })
  if (!res.ok) throw new Error(i18n.t('api.deleteFailed'))
}

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

export interface UpdateSettingsRequest {
  language?: AppLanguage
  theme?: AppTheme
  providerLimits?: ProviderLimits
  defaultFilters?: DashboardDefaultFilters
  sectionVisibility?: DashboardSectionVisibility
  sectionOrder?: DashboardSectionOrder
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch('/api/settings')
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.fetchSettingsFailed')))
  }
  return normalizeAppSettings(await parseResponseJson<unknown>(res))
}

export async function loadBootstrapSettings(): Promise<BootstrapSettingsResult> {
  try {
    const response = await fetch('/api/settings')

    if (!response.ok) {
      return {
        settings: DEFAULT_APP_SETTINGS,
        errorMessage: await readErrorMessage(response, i18n.t('api.fetchSettingsFailed')),
        loadedFromServer: false,
      }
    }

    return {
      settings: normalizeAppSettings(await parseResponseJson<unknown>(response)),
      errorMessage: null,
      loadedFromServer: true,
    }
  } catch {
    return {
      settings: DEFAULT_APP_SETTINGS,
      errorMessage: null,
      loadedFromServer: false,
    }
  }
}

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

export async function deleteSettings(): Promise<AppSettings> {
  const res = await fetch('/api/settings', { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(await readErrorMessage(res, i18n.t('api.deleteSettingsFailed')))
  }

  const payload = await parseResponseJson<{ settings?: unknown }>(res)
  return normalizeAppSettings(payload.settings)
}

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

export interface PdfReportRequest {
  viewMode: ViewMode
  selectedMonth: string | null
  selectedProviders: string[]
  selectedModels: string[]
  startDate?: string
  endDate?: string
  language?: 'de' | 'en'
}

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
