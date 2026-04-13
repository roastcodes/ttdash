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
    expect(parsed.viewModes).toContain('monthly')
  })

  it('fails fast when the shared preferences JSON drifts from the expected shape', () => {
    expect(() =>
      parseDashboardPreferencesConfig({
        datePresets: ['all'],
        viewModes: ['daily', 'weekly'],
        sectionDefinitions: [{ id: 'metrics', domId: 'metrics' }],
      }),
    ).toThrow('Invalid dashboard preferences')
  })
})
