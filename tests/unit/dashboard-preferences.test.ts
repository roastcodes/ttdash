import { describe, expect, it } from 'vitest'
import dashboardPreferences from '../../shared/dashboard-preferences.json'
import {
  DASHBOARD_SECTION_DEFINITIONS,
  parseDashboardPreferencesConfig,
} from '@/lib/dashboard-preferences'

describe('dashboard preferences config', () => {
  it('parses the shared dashboard preferences JSON into a validated config', () => {
    const parsed = parseDashboardPreferencesConfig(dashboardPreferences)

    expect(parsed.sectionDefinitions).toEqual(DASHBOARD_SECTION_DEFINITIONS)
    expect(parsed.viewModes).toEqual(dashboardPreferences.viewModes)
    expect(parsed.datePresets).toEqual(dashboardPreferences.datePresets)
  })

  it('fails fast when datePresets contain unsupported values', () => {
    expect(() =>
      parseDashboardPreferencesConfig({
        datePresets: ['all', 'ever'],
        viewModes: dashboardPreferences.viewModes,
        sectionDefinitions: dashboardPreferences.sectionDefinitions,
      }),
    ).toThrow('Invalid dashboard preferences')
  })

  it('fails fast when viewModes contain unsupported values', () => {
    expect(() =>
      parseDashboardPreferencesConfig({
        datePresets: dashboardPreferences.datePresets,
        viewModes: ['daily', 'weekly'],
        sectionDefinitions: dashboardPreferences.sectionDefinitions,
      }),
    ).toThrow('Invalid dashboard preferences')
  })

  it('fails fast when sectionDefinitions entries are malformed', () => {
    expect(() =>
      parseDashboardPreferencesConfig({
        datePresets: dashboardPreferences.datePresets,
        viewModes: dashboardPreferences.viewModes,
        sectionDefinitions: [{ id: 'metrics', domId: 'metrics' }],
      }),
    ).toThrow('Invalid dashboard preferences')
  })
})
