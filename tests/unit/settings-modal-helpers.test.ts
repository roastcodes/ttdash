import { describe, expect, it } from 'vitest'
import { DEFAULT_DASHBOARD_FILTERS } from '@/lib/dashboard-preferences'
import {
  buildSettingsProviderLimitDraft,
  cloneSettingsDefaultFilters,
  cloneSettingsSectionOrder,
  cloneSettingsSectionVisibility,
  normalizeSettingsSelection,
  parseSettingsNumberInput,
  patchSettingsProviderLimitDraft,
  reorderSettingsSections,
  toggleSettingsSelection,
} from '@/components/features/settings/settings-modal-helpers'

describe('settings modal helpers', () => {
  it('reorders sections by inserting the dragged item before the target section', () => {
    expect(reorderSettingsSections(['metrics', 'activity', 'tables'], 'metrics', 'tables')).toEqual(
      ['activity', 'metrics', 'tables'],
    )
  })

  it('replaces provider-limit draft state instead of preserving stale providers', () => {
    expect(
      buildSettingsProviderLimitDraft(['OpenAI', 'Anthropic'], {
        OpenAI: {
          monthlyLimit: 120,
          hasSubscription: false,
          subscriptionPrice: 0,
        },
        Anthropic: {
          monthlyLimit: 0,
          hasSubscription: true,
          subscriptionPrice: 50,
        },
        Legacy: {
          monthlyLimit: 999,
          hasSubscription: true,
          subscriptionPrice: 999,
        },
      }),
    ).toEqual({
      OpenAI: {
        monthlyLimit: 120,
        hasSubscription: false,
        subscriptionPrice: 0,
      },
      Anthropic: {
        monthlyLimit: 0,
        hasSubscription: true,
        subscriptionPrice: 50,
      },
    })
  })

  it('patches a provider draft from defaults when the provider has no existing config yet', () => {
    expect(
      patchSettingsProviderLimitDraft({}, 'OpenAI', {
        hasSubscription: true,
      }),
    ).toEqual({
      OpenAI: {
        hasSubscription: true,
        subscriptionPrice: 0,
        monthlyLimit: 0,
      },
    })
  })

  it('parses settings number inputs as non-negative rounded values', () => {
    expect(parseSettingsNumberInput('12,345')).toBe(12.35)
    expect(parseSettingsNumberInput('-5')).toBe(0)
    expect(parseSettingsNumberInput('abc')).toBe(0)
    expect(parseSettingsNumberInput('')).toBe(0)
  })

  it('normalizes, clones, and toggles settings draft collections without mutating the inputs', () => {
    const providerSelection = [' OpenAI ', 'Anthropic', 'OpenAI']
    const sourceVisibility = {
      metrics: true,
      activity: false,
      forecast: true,
      limits: true,
      cost: true,
      tokens: true,
      requests: true,
      advanced: true,
      comparisons: true,
      tables: true,
    }
    const sourceOrder = ['metrics', 'activity', 'tables'] as const
    const filters = cloneSettingsDefaultFilters(DEFAULT_DASHBOARD_FILTERS)
    const visibility = cloneSettingsSectionVisibility(sourceVisibility)
    const order = cloneSettingsSectionOrder([...sourceOrder])

    expect(normalizeSettingsSelection(providerSelection)).toEqual(['Anthropic', 'OpenAI'])
    expect(toggleSettingsSelection(['OpenAI'], 'Anthropic')).toEqual(['OpenAI', 'Anthropic'])
    expect(toggleSettingsSelection(['OpenAI', 'Anthropic'], 'Anthropic')).toEqual(['OpenAI'])
    expect(filters).toEqual(DEFAULT_DASHBOARD_FILTERS)
    expect(filters).not.toBe(DEFAULT_DASHBOARD_FILTERS)
    expect(visibility).toEqual(sourceVisibility)
    expect(visibility).not.toBe(sourceVisibility)
    expect(order).toEqual(sourceOrder)
    expect(order).not.toBe(sourceOrder)
  })
})
