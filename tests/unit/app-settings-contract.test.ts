import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APP_SETTINGS,
  normalizeAppLanguage,
  normalizeAppSettings,
  normalizeAppTheme,
  normalizeDataLoadSource,
  normalizeReducedMotionPreference,
  normalizeStoredProviderLimits,
  normalizeStoredTimestamp,
} from '@/lib/app-settings'
import {
  DEFAULT_DASHBOARD_FILTERS,
  getDefaultDashboardSectionOrder,
  getDefaultDashboardSectionVisibility,
  normalizeDashboardDefaultFilters,
  normalizeDashboardSectionOrder,
  normalizeDashboardSectionVisibility,
} from '@/lib/dashboard-preferences'
import { DEFAULT_PROVIDER_LIMIT_CONFIG, normalizeProviderLimitConfig } from '@/lib/provider-limits'
import {
  DEFAULT_DASHBOARD_FILTERS as SHARED_DEFAULT_DASHBOARD_FILTERS,
  DEFAULT_PROVIDER_LIMIT_CONFIG as SHARED_DEFAULT_PROVIDER_LIMIT_CONFIG,
  createDefaultAppSettings,
  createDefaultPersistedAppSettings,
  getDefaultDashboardSectionOrder as getSharedDefaultDashboardSectionOrder,
  getDefaultDashboardSectionVisibility as getSharedDefaultDashboardSectionVisibility,
  normalizeAppSettings as normalizeSharedAppSettings,
  normalizeDashboardDefaultFilters as normalizeSharedDashboardDefaultFilters,
  normalizeDashboardSectionOrder as normalizeSharedDashboardSectionOrder,
  normalizeDashboardSectionVisibility as normalizeSharedDashboardSectionVisibility,
  normalizePersistedAppSettings,
  normalizeProviderLimitConfig as normalizeSharedProviderLimitConfig,
} from '../../shared/app-settings.js'

describe('shared app settings contract', () => {
  it('keeps frontend defaults aligned with the shared settings contract', () => {
    expect(DEFAULT_APP_SETTINGS).toEqual(createDefaultAppSettings())
    expect(DEFAULT_DASHBOARD_FILTERS).toEqual(SHARED_DEFAULT_DASHBOARD_FILTERS)
    expect(DEFAULT_PROVIDER_LIMIT_CONFIG).toEqual(SHARED_DEFAULT_PROVIDER_LIMIT_CONFIG)
    expect(getDefaultDashboardSectionVisibility()).toEqual(
      getSharedDefaultDashboardSectionVisibility(),
    )
    expect(getDefaultDashboardSectionOrder()).toEqual(getSharedDefaultDashboardSectionOrder())
  })

  it('normalizes app settings through the same shared contract on the frontend', () => {
    const payload = {
      language: 'fr',
      theme: 'sunrise',
      reducedMotionPreference: 'sometimes',
      providerLimits: {
        OpenAI: {
          hasSubscription: 1,
          subscriptionPrice: 19.999,
          monthlyLimit: -4,
        },
        Anthropic: null,
      },
      defaultFilters: {
        viewMode: 'yearly',
        datePreset: 'ever',
        providers: [' OpenAI ', '', 'OpenAI'],
        models: [' GPT-5.4 ', 5, 'GPT-5.4'],
      },
      sectionVisibility: {
        tables: false,
        comparisons: false,
        unknown: true,
      },
      sectionOrder: ['tables', 'metrics', 'tables', 'unknown'],
      lastLoadedAt: '2026-04-01T12:34:56+02:00',
      lastLoadSource: 'cli-auto-load',
      cliAutoLoadActive: 'yes',
    }

    expect(normalizeAppSettings(payload)).toEqual(normalizeSharedAppSettings(payload))
  })

  it('normalizes frontend app-settings fragments through the shared wrappers', () => {
    expect(normalizeAppLanguage('en')).toBe('en')
    expect(normalizeAppLanguage('fr')).toBe('de')
    expect(normalizeAppTheme('light')).toBe('light')
    expect(normalizeAppTheme('system')).toBe('dark')
    expect(normalizeReducedMotionPreference('always')).toBe('always')
    expect(normalizeReducedMotionPreference('never')).toBe('never')
    expect(normalizeReducedMotionPreference('sometimes')).toBe('system')
    expect(normalizeDataLoadSource('file')).toBe('file')
    expect(normalizeDataLoadSource('cli-auto-load')).toBe('cli-auto-load')
    expect(normalizeDataLoadSource('manual')).toBeNull()
    expect(normalizeStoredTimestamp('2026-04-01T12:34:56+02:00')).toBe('2026-04-01T10:34:56.000Z')
    expect(normalizeStoredTimestamp('not a timestamp')).toBeNull()
    expect(
      normalizeStoredProviderLimits({
        OpenAI: {
          hasSubscription: true,
          subscriptionPrice: 12.345,
          monthlyLimit: -1,
        },
      }),
    ).toEqual({
      OpenAI: {
        hasSubscription: true,
        subscriptionPrice: 12.35,
        monthlyLimit: 0,
      },
    })
  })

  it('normalizes dashboard fragments and provider limits through the shared contract', () => {
    const filters = {
      viewMode: 'weekly',
      datePreset: '30d',
      providers: [' Anthropic ', '', 'Anthropic'],
      models: [' Claude Sonnet 4.5 ', ''],
    }
    const sectionVisibility = {
      metrics: false,
      tables: false,
      stray: true,
    }
    const sectionOrder = ['tables', 'metrics', 'tables', 'missing']
    const providerLimit = {
      hasSubscription: 'yes',
      subscriptionPrice: 42.555,
      monthlyLimit: -10,
    }

    expect(normalizeDashboardDefaultFilters(filters)).toEqual(
      normalizeSharedDashboardDefaultFilters(filters),
    )
    expect(normalizeDashboardSectionVisibility(sectionVisibility)).toEqual(
      normalizeSharedDashboardSectionVisibility(sectionVisibility),
    )
    expect(normalizeDashboardSectionOrder(sectionOrder)).toEqual(
      normalizeSharedDashboardSectionOrder(sectionOrder),
    )
    expect(normalizeProviderLimitConfig(providerLimit)).toEqual(
      normalizeSharedProviderLimitConfig(providerLimit),
    )
  })

  it('keeps runtime-only flags out of the persisted settings shape', () => {
    expect(
      normalizePersistedAppSettings({
        theme: 'light',
        cliAutoLoadActive: true,
      }),
    ).toEqual({
      ...createDefaultPersistedAppSettings(),
      theme: 'light',
    })
  })
})
