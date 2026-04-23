import type { ComponentProps } from 'react'
import { vi } from 'vitest'
import { SettingsModal } from '@/components/features/settings/SettingsModal'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import { TOKTRACK_VERSION } from '../../shared/toktrack-version.js'
import { renderWithAppProviders } from '../test-utils'

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
    defaultFilters: {
      ...DEFAULT_APP_SETTINGS.defaultFilters,
      providers: [...DEFAULT_APP_SETTINGS.defaultFilters.providers],
      models: [...DEFAULT_APP_SETTINGS.defaultFilters.models],
    },
    sectionVisibility: { ...DEFAULT_APP_SETTINGS.sectionVisibility },
    sectionOrder: [...DEFAULT_APP_SETTINGS.sectionOrder],
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
  const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    if (url !== '/api/toktrack/version-status') {
      throw new Error(`Unexpected fetch in settings-modal test: ${url}`)
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
