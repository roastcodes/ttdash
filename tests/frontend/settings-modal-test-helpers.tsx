import type { ComponentProps } from 'react'
import { vi } from 'vitest'
import { SettingsModal } from '@/components/features/settings/SettingsModal'
import { TOKTRACK_VERSION } from '../../shared/toktrack-version.js'
import { renderWithAppProviders } from '../test-utils'

const defaultSectionVisibility = {
  insights: true,
  metrics: true,
  today: true,
  currentMonth: true,
  activity: true,
  forecastCache: true,
  limits: true,
  costAnalysis: true,
  tokenAnalysis: true,
  requestAnalysis: true,
  advancedAnalysis: true,
  comparisons: true,
  tables: true,
}

const defaultSectionOrder = [
  'insights',
  'metrics',
  'today',
  'currentMonth',
  'activity',
  'forecastCache',
  'limits',
  'costAnalysis',
  'tokenAnalysis',
  'requestAnalysis',
  'advancedAnalysis',
  'comparisons',
  'tables',
] as const

export function buildSettingsModalProps(
  overrides: Partial<ComponentProps<typeof SettingsModal>> = {},
): ComponentProps<typeof SettingsModal> {
  return {
    open: true,
    onOpenChange: vi.fn(),
    language: 'de',
    reducedMotionPreference: 'system',
    limitProviders: [],
    filterProviders: [],
    models: [],
    limits: {},
    defaultFilters: { viewMode: 'daily', datePreset: 'all', providers: [], models: [] },
    sectionVisibility: defaultSectionVisibility,
    sectionOrder: [...defaultSectionOrder],
    lastLoadedAt: null,
    lastLoadSource: null,
    cliAutoLoadActive: false,
    hasData: false,
    onSaveSettings: vi.fn().mockResolvedValue(undefined),
    onExportSettings: vi.fn(),
    onImportSettings: vi.fn(),
    onExportData: vi.fn(),
    onImportData: vi.fn(),
    ...overrides,
  }
}

export function renderSettingsModal(overrides: Partial<ComponentProps<typeof SettingsModal>> = {}) {
  const props = buildSettingsModalProps(overrides)
  const view = renderWithAppProviders(<SettingsModal {...props} />)
  return {
    ...view,
    props,
    onSaveSettings: props.onSaveSettings,
  }
}

export function stubToktrackVersionStatus(
  body = {
    configuredVersion: TOKTRACK_VERSION,
    latestVersion: TOKTRACK_VERSION,
    isLatest: true,
    lookupStatus: 'ok',
  },
) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
