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
import { normalizeAppSettings } from '@/lib/app-settings'

export async function fetchUsage(): Promise<UsageData> {
  const res = await fetch('/api/usage')
  if (!res.ok) throw new Error(i18n.t('api.fetchUsageFailed'))
  return res.json()
}

export async function uploadData(data: unknown): Promise<{ days: number; totalCost: number }> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: i18n.t('api.uploadFailed') }))
    throw new Error(err.message)
  }
  return res.json()
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
    const err = await res.json().catch(() => ({ message: i18n.t('api.importUsageFailed') }))
    throw new Error(err.message)
  }
  return res.json()
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
  if (!res.ok) throw new Error('Failed to load settings')
  return normalizeAppSettings(await res.json())
}

export async function updateSettings(patch: UpdateSettingsRequest): Promise<AppSettings> {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to save settings' }))
    throw new Error(err.message)
  }
  return normalizeAppSettings(await res.json())
}

export async function importSettings(data: unknown): Promise<AppSettings> {
  const res = await fetch('/api/settings/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: i18n.t('api.importSettingsFailed') }))
    throw new Error(err.message)
  }
  return normalizeAppSettings(await res.json())
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
    const err = await res.json().catch(() => ({ message: i18n.t('api.pdfFailed') }))
    throw new Error(err.message)
  }

  return res.blob()
}
