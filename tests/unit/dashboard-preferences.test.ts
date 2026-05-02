import { describe, expect, it } from 'vitest'
import dashboardPreferences from '../../shared/dashboard-preferences.json'
import {
  DEFAULT_DASHBOARD_FILTERS,
  DASHBOARD_DATE_PRESETS,
  DASHBOARD_QUICK_DATE_PRESETS,
  DASHBOARD_SECTION_DEFINITIONS,
  DASHBOARD_SECTION_DEFINITION_MAP,
  DASHBOARD_VIEW_MODES,
  getDefaultDashboardSectionVisibility,
  normalizeDashboardDefaultFilters,
  normalizeDashboardSectionOrder,
  normalizeDashboardSectionVisibility,
  parseDashboardPreferencesConfig,
  resolveDashboardActivePreset,
  resolveDashboardPresetRange,
} from '@/lib/dashboard-preferences'
import {
  parseDashboardPreferencesConfig as parseSharedDashboardPreferencesConfig,
  resolveDashboardActivePreset as resolveSharedDashboardActivePreset,
  resolveDashboardPresetRange as resolveSharedDashboardPresetRange,
} from '../../shared/dashboard-preferences.js'

describe('dashboard preferences config', () => {
  it('parses the shared dashboard preferences JSON into a validated config', () => {
    const parsed = parseDashboardPreferencesConfig(dashboardPreferences)

    expect(parsed).toEqual(parseSharedDashboardPreferencesConfig(dashboardPreferences))
    expect(parsed.sectionDefinitions).toEqual(DASHBOARD_SECTION_DEFINITIONS)
    expect(parsed.viewModes).toEqual(DASHBOARD_VIEW_MODES)
    expect(parsed.datePresets).toEqual(DASHBOARD_DATE_PRESETS)
    expect(DASHBOARD_SECTION_DEFINITION_MAP.forecastCache.domId).toBe('forecast-cache')
  })

  it('publishes the quick date presets in display order from the shared contract', () => {
    expect(DASHBOARD_QUICK_DATE_PRESETS).toEqual(['7d', '30d', 'month', 'year', 'all'])
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

  it('fails fast when sectionDefinitions omit or duplicate supported ids', () => {
    const [firstSection, secondSection, ...remainingSections] =
      dashboardPreferences.sectionDefinitions

    expect(() =>
      parseDashboardPreferencesConfig({
        datePresets: dashboardPreferences.datePresets,
        viewModes: dashboardPreferences.viewModes,
        sectionDefinitions: [firstSection, firstSection, ...remainingSections],
      }),
    ).toThrow('duplicate ids')

    expect(() =>
      parseDashboardPreferencesConfig({
        datePresets: dashboardPreferences.datePresets,
        viewModes: dashboardPreferences.viewModes,
        sectionDefinitions: [firstSection, ...remainingSections],
      }),
    ).toThrow('include every id once')

    expect(secondSection).toBeDefined()
  })

  it('fails fast when sectionDefinitions reuse DOM ids', () => {
    const [firstSection, secondSection, ...remainingSections] =
      dashboardPreferences.sectionDefinitions

    expect(() =>
      parseDashboardPreferencesConfig({
        datePresets: dashboardPreferences.datePresets,
        viewModes: dashboardPreferences.viewModes,
        sectionDefinitions: [
          firstSection,
          { ...secondSection, domId: firstSection.domId },
          ...remainingSections,
        ],
      }),
    ).toThrow('duplicate section domId')
  })

  it('supports custom validation scopes for parsed preference configs', () => {
    const parsed = parseSharedDashboardPreferencesConfig(
      {
        datePresets: ['rolling'],
        viewModes: ['compact'],
        sectionDefinitions: [{ id: 'overview', domId: 'overview', labelKey: 'overview' }],
      },
      {
        validDatePresets: ['rolling'],
        validViewModes: ['compact'],
        validSectionIds: ['overview'],
      },
    )

    expect(parsed.datePresets).toEqual(['rolling'])
    expect(parsed.viewModes).toEqual(['compact'])
    expect(parsed.sectionDefinitions).toEqual([
      { id: 'overview', domId: 'overview', labelKey: 'overview' },
    ])
  })

  it('rejects malformed custom preference shapes before publishing partial configs', () => {
    expect(() => parseSharedDashboardPreferencesConfig(null)).toThrow('expected an object')
    expect(() =>
      parseSharedDashboardPreferencesConfig(
        {
          datePresets: 'all',
          viewModes: ['daily'],
          sectionDefinitions: [{ id: 'overview', domId: 'overview', labelKey: 'overview' }],
        },
        {
          validDatePresets: ['all'],
          validViewModes: ['daily'],
          validSectionIds: ['overview'],
        },
      ),
    ).toThrow('"datePresets" must be an array')
    expect(() =>
      parseSharedDashboardPreferencesConfig(
        {
          datePresets: ['all'],
          viewModes: ['daily'],
          sectionDefinitions: [null],
        },
        {
          validDatePresets: ['all'],
          validViewModes: ['daily'],
          validSectionIds: ['overview'],
        },
      ),
    ).toThrow('each "sectionDefinitions" entry must be an object')
    expect(() =>
      parseSharedDashboardPreferencesConfig(
        {
          datePresets: ['all'],
          viewModes: ['daily'],
          sectionDefinitions: [{ id: 'overview', domId: '', labelKey: 'overview' }],
        },
        {
          validDatePresets: ['all'],
          validViewModes: ['daily'],
          validSectionIds: ['overview'],
        },
      ),
    ).toThrow('require a domId')
    expect(() =>
      parseSharedDashboardPreferencesConfig(
        {
          datePresets: ['all'],
          viewModes: ['daily'],
          sectionDefinitions: [{ id: 'overview', domId: 'overview', labelKey: '' }],
        },
        {
          validDatePresets: ['all'],
          validViewModes: ['daily'],
          validSectionIds: ['overview'],
        },
      ),
    ).toThrow('require a labelKey')
  })

  it('normalizes persisted dashboard preference branches defensively', () => {
    expect(normalizeDashboardDefaultFilters(null)).toEqual(DEFAULT_DASHBOARD_FILTERS)
    expect(
      normalizeDashboardDefaultFilters({
        viewMode: 'yearly',
        datePreset: '30d',
        providers: [' OpenAI ', 'OpenAI', '', 42],
        models: [' Sonnet ', null, 'Sonnet'],
      }),
    ).toEqual({
      viewMode: 'yearly',
      datePreset: '30d',
      providers: ['OpenAI'],
      models: ['Sonnet'],
    })

    const visibility = normalizeDashboardSectionVisibility({
      metrics: false,
      today: 'false',
      unknown: false,
    })
    const defaultVisibility = getDefaultDashboardSectionVisibility()
    expect(visibility.metrics).toBe(false)
    expect(visibility.today).toBe(defaultVisibility.today)
    expect(visibility).not.toHaveProperty('unknown')

    const orderedSections = normalizeDashboardSectionOrder(['tables', 'metrics', 'tables', 7])
    expect(orderedSections.slice(0, 2)).toEqual(['tables', 'metrics'])
    expect(new Set(orderedSections).size).toBe(DASHBOARD_SECTION_DEFINITIONS.length)
  })

  it('resolves preset ranges through the same shared contract used by runtime consumers', () => {
    const referenceDate = new Date('2026-04-06T12:00:00Z')

    expect(resolveDashboardPresetRange('7d', referenceDate)).toEqual(
      resolveSharedDashboardPresetRange('7d', referenceDate),
    )
    expect(resolveDashboardPresetRange('30d', referenceDate)).toEqual({
      startDate: '2026-03-08',
      endDate: '2026-04-06',
    })
    expect(resolveDashboardPresetRange('year', referenceDate)).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-04-06',
    })
    expect(resolveDashboardPresetRange('all', referenceDate)).toEqual({
      startDate: undefined,
      endDate: undefined,
    })
  })

  it('resolves the active preset through the shared contract', () => {
    const referenceDate = new Date('2026-04-06T12:00:00Z')
    const monthRange = resolveDashboardPresetRange('month', referenceDate)

    expect(
      resolveDashboardActivePreset({
        referenceDate,
        ...monthRange,
      }),
    ).toBe(resolveSharedDashboardActivePreset({ referenceDate, ...monthRange }))
    expect(resolveDashboardActivePreset({ referenceDate })).toBe('all')
    expect(resolveDashboardActivePreset({ selectedMonth: '2026-04', ...monthRange })).toBeNull()
    expect(
      resolveDashboardActivePreset({
        referenceDate,
        startDate: monthRange.startDate,
      }),
    ).toBeNull()
    expect(resolveDashboardActivePreset(null)).toBe('all')
    expect(
      resolveDashboardActivePreset({
        referenceDate,
        startDate: '2026-04-01',
        endDate: '2026-04-05',
      }),
    ).toBeNull()
  })
})
