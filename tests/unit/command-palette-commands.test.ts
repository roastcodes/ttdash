import { describe, expect, it, vi } from 'vitest'
import {
  buildCommandPaletteCommands,
  filterCommandItems,
  getVisibleCommandItems,
  normalizeSearchValue,
} from '@/components/features/command-palette/CommandPalette.commands'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import type { DashboardSectionId } from '@/types'

type CommandPaletteCommandOptions = Parameters<typeof buildCommandPaletteCommands>[0]

const providerLabels = ['Anthropic', 'Google', 'OpenAI']
const modelLabels = ['Claude Sonnet 4.5', 'Gemini 2.5 Pro', 'GPT-5.4']
const expectedCommandTestIds = [
  'command-auto-import',
  'command-settings-open',
  'command-csv',
  'command-report',
  'command-upload',
  'command-delete',
  'command-view-daily',
  'command-view-monthly',
  'command-view-yearly',
  'command-preset-7d',
  'command-preset-30d',
  'command-preset-month',
  'command-preset-year',
  'command-preset-all',
  'command-clear-providers',
  'command-clear-models',
  'command-clear-dates',
  'command-reset-all',
  'command-top',
  'command-bottom',
  'command-filters',
  'command-theme',
  'command-language-de',
  'command-language-en',
  'command-help',
  ...DEFAULT_APP_SETTINGS.sectionOrder.map((sectionId) => `command-section-${sectionId}`),
  ...providerLabels.map((provider) => `command-provider-${provider}`),
  ...modelLabels.map((model) => `command-model-${model}`),
].sort()

const translations: Record<string, string> = {
  'commandPalette.commands.autoImport.label': 'Auto import',
  'commandPalette.commands.autoImport.description': 'Import data from toktrack',
  'commandPalette.commands.upload.label': 'Upload file',
  'commandPalette.commands.upload.description': 'Upload JSON usage data',
  'commandPalette.commands.exportCsv.label': 'Export CSV',
  'commandPalette.commands.exportCsv.description': 'Download CSV',
  'commandPalette.commands.generateReport.label': 'Report',
  'commandPalette.commands.generateReport.labelLoading': 'Generating report',
  'commandPalette.commands.generateReport.description': 'Download PDF report',
  'commandPalette.commands.openSettings.label': 'Settings',
  'commandPalette.commands.openSettings.description': 'Open settings',
  'commandPalette.commands.delete.label': 'Delete',
  'commandPalette.commands.delete.description': 'Delete data',
  'commandPalette.commands.viewDaily.label': 'Daily view',
  'commandPalette.commands.viewDaily.description': 'Switch to daily view',
  'commandPalette.commands.viewMonthly.label': 'Monthly view',
  'commandPalette.commands.viewMonthly.description': 'Switch to monthly view',
  'commandPalette.commands.viewYearly.label': 'Yearly view',
  'commandPalette.commands.viewYearly.description': 'Switch to yearly view',
  'commandPalette.commands.preset7d.label': '7D',
  'commandPalette.commands.preset7d.description': 'Last 7 days',
  'commandPalette.commands.preset30d.label': '30D',
  'commandPalette.commands.preset30d.description': 'Last 30 days',
  'commandPalette.commands.presetMonth.label': 'Month',
  'commandPalette.commands.presetMonth.description': 'Current month',
  'commandPalette.commands.presetYear.label': 'Year',
  'commandPalette.commands.presetYear.description': 'Current year',
  'commandPalette.commands.presetAll.label': 'All',
  'commandPalette.commands.presetAll.description': 'All data',
  'commandPalette.commands.clearProviders.label': 'Clear providers',
  'commandPalette.commands.clearProviders.description': 'Clear provider filters',
  'commandPalette.commands.clearModels.label': 'Clear models',
  'commandPalette.commands.clearModels.description': 'Clear model filters',
  'commandPalette.commands.clearDates.label': 'Clear dates',
  'commandPalette.commands.clearDates.description': 'Clear date range',
  'commandPalette.commands.resetAll.label': 'Reset all',
  'commandPalette.commands.resetAll.description': 'Reset dashboard filters',
  'commandPalette.commands.scrollTop.label': 'Top',
  'commandPalette.commands.scrollTop.description': 'Scroll to top',
  'commandPalette.commands.scrollBottom.label': 'Bottom',
  'commandPalette.commands.scrollBottom.description': 'Scroll to bottom',
  'commandPalette.commands.filters.label': 'Filters',
  'commandPalette.commands.filters.description': 'Go to filters',
  'commandPalette.commands.themeLight.label': 'Light theme',
  'commandPalette.commands.themeDark.label': 'Dark theme',
  'commandPalette.commands.themeDark.description': 'Toggle theme',
  'commandPalette.commands.languageGerman.label': 'German',
  'commandPalette.commands.languageGerman.description': 'Switch to German',
  'commandPalette.commands.languageEnglish.label': 'English',
  'commandPalette.commands.languageEnglish.description': 'Switch to English',
  'commandPalette.commands.help.label': 'Help',
  'commandPalette.commands.help.description': 'Open help',
  'commandPalette.groups.loadData': 'Load data',
  'commandPalette.groups.exports': 'Exports',
  'commandPalette.groups.maintenance': 'Maintenance',
  'commandPalette.groups.filters': 'Filters',
  'commandPalette.groups.navigation': 'Navigation',
  'commandPalette.groups.view': 'View',
  'commandPalette.groups.language': 'Language',
  'commandPalette.groups.help': 'Help',
  'commandPalette.groups.providers': 'Providers',
  'commandPalette.groups.models': 'Models',
  'common.provider': 'Provider',
  'common.model': 'Model',
}

function t(key: string, options?: Record<string, unknown>) {
  if (key === 'commandPalette.commands.goToSection.label') {
    return `Go to ${String(options?.section)}`
  }

  if (key === 'commandPalette.commands.goToSection.description') {
    return `Scroll to ${String(options?.section)}`
  }

  return translations[key] ?? key
}

function buildOptions(overrides: Partial<CommandPaletteCommandOptions> = {}) {
  const noop = vi.fn()

  return {
    isDark: true,
    availableProviders: providerLabels,
    selectedProviders: [],
    availableModels: modelLabels,
    selectedModels: [],
    hasTodaySection: true,
    hasMonthSection: true,
    hasRequestSection: true,
    sectionVisibility: { ...DEFAULT_APP_SETTINGS.sectionVisibility },
    sectionOrder: [...DEFAULT_APP_SETTINGS.sectionOrder],
    reportGenerating: false,
    onToggleTheme: noop,
    onExportCSV: noop,
    onGenerateReport: noop,
    onDelete: noop,
    onUpload: noop,
    onAutoImport: noop,
    onOpenSettings: noop,
    onScrollTo: noop,
    onScrollTop: noop,
    onScrollBottom: noop,
    onViewModeChange: noop,
    onApplyPreset: noop,
    onToggleProvider: noop,
    onToggleModel: noop,
    onClearProviders: noop,
    onClearModels: noop,
    onClearDateRange: noop,
    onResetAll: noop,
    onHelp: noop,
    onLanguageChange: noop,
    t,
    ...overrides,
  } satisfies CommandPaletteCommandOptions
}

describe('command palette command builder', () => {
  it('builds the complete command contract for the seeded dashboard state', () => {
    const commands = buildCommandPaletteCommands(buildOptions())

    expect(commands.map((cmd) => cmd.testId ?? `command-${cmd.id}`).sort()).toEqual(
      expectedCommandTestIds,
    )
  })

  it('keeps section commands ordered and filtered by visibility and availability', () => {
    const sectionOrder: DashboardSectionId[] = [
      'tables',
      'requestAnalysis',
      'today',
      'costAnalysis',
    ]
    const commands = buildCommandPaletteCommands(
      buildOptions({
        hasRequestSection: false,
        hasTodaySection: false,
        sectionOrder,
        sectionVisibility: {
          ...DEFAULT_APP_SETTINGS.sectionVisibility,
          costAnalysis: false,
        },
      }),
    )

    expect(
      commands.filter((cmd) => cmd.id.startsWith('section-')).map((cmd) => cmd.testId),
    ).toEqual(['command-section-tables'])
  })

  it('normalizes aliases and ranks matching commands for keyboard quick-select', () => {
    const commands = buildCommandPaletteCommands(buildOptions())
    const settingsResults = filterCommandItems(commands, 'einstellungen offnen')
    const visibleResults = getVisibleCommandItems(settingsResults)

    expect(normalizeSearchValue('Einstellungen öffnen')).toBe('einstellungen offnen')
    expect(visibleResults[0]?.id).toBe('settings-open')
    expect(filterCommandItems(commands, 'not-a-real-command')).toHaveLength(0)
  })

  it('wires dynamic provider and model commands to their callbacks', () => {
    const onToggleProvider = vi.fn()
    const onToggleModel = vi.fn()
    const commands = buildCommandPaletteCommands(
      buildOptions({
        selectedProviders: ['OpenAI'],
        selectedModels: ['GPT-5.4'],
        onToggleProvider,
        onToggleModel,
      }),
    )

    const providerCommand = commands.find((cmd) => cmd.id === 'provider-OpenAI')
    const modelCommand = commands.find((cmd) => cmd.id === 'model-GPT-5.4')

    expect(providerCommand?.label).toBe('Clear providers: OpenAI')
    providerCommand?.action()
    expect(onToggleProvider).toHaveBeenCalledWith('OpenAI')

    expect(modelCommand?.label).toBe('Clear models: GPT-5.4')
    modelCommand?.action()
    expect(onToggleModel).toHaveBeenCalledWith('GPT-5.4')
  })
})
