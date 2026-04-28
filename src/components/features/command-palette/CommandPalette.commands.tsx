import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calendar,
  CalendarRange,
  ChartBar,
  CircleHelp,
  Download,
  Filter,
  Languages,
  Layers3,
  LineChart,
  Moon,
  RefreshCcw,
  Sigma,
  SlidersHorizontal,
  Sun,
  Table,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react'
import { DASHBOARD_SECTION_DEFINITION_MAP } from '@/lib/dashboard-preferences'
import type { DashboardCommandPaletteViewModel } from '@/types/dashboard-view-model'
import type { DashboardSectionId } from '@/types'

/** Describes one executable command rendered by the dashboard command palette. */
export interface CommandItem {
  id: string
  label: string
  description?: string
  keywords?: string[]
  aliases?: string[]
  shortcut?: string
  icon: React.ReactNode
  action: () => void
  group: string
  testId?: string
}

type Translate = (key: string, options?: Record<string, unknown>) => string

type CommandPaletteBuilderOptions = DashboardCommandPaletteViewModel & {
  onScrollBottom: () => void
  onScrollTop: () => void
  t: Translate
}

type SectionNavigationOptions = Pick<
  DashboardCommandPaletteViewModel,
  'onScrollTo' | 'sectionOrder' | 'sectionVisibility'
> & {
  sectionAvailability: Record<DashboardSectionId, boolean>
  t: Translate
}

const SECTION_COMMAND_ICON_MAP: Record<DashboardSectionId, React.ReactNode> = {
  insights: <Sigma className="h-4 w-4" />,
  metrics: <ChartBar className="h-4 w-4" />,
  today: <Calendar className="h-4 w-4" />,
  currentMonth: <CalendarRange className="h-4 w-4" />,
  activity: <Calendar className="h-4 w-4" />,
  forecastCache: <LineChart className="h-4 w-4" />,
  limits: <SlidersHorizontal className="h-4 w-4" />,
  costAnalysis: <BarChart3 className="h-4 w-4" />,
  tokenAnalysis: <Layers3 className="h-4 w-4" />,
  requestAnalysis: <LineChart className="h-4 w-4" />,
  advancedAnalysis: <Sigma className="h-4 w-4" />,
  comparisons: <LineChart className="h-4 w-4" />,
  tables: <Table className="h-4 w-4" />,
}

const SECTION_COMMAND_KEYWORDS: Record<DashboardSectionId, string[]> = {
  insights: ['summary', 'insight'],
  metrics: ['kpi', 'zahlen'],
  today: ['today', 'heute'],
  currentMonth: ['monat', 'current month'],
  activity: ['heatmap', 'aktivität'],
  forecastCache: ['forecast', 'cache', 'roi'],
  limits: ['limits', 'subscriptions', 'budget', 'anbieter limits'],
  costAnalysis: ['charts', 'kostenanalyse'],
  tokenAnalysis: ['tokens', 'token analyse'],
  requestAnalysis: ['requests', 'request analyse', 'anfragen'],
  advancedAnalysis: ['advanced analysis', 'distributions', 'risk', 'verteilungen'],
  comparisons: ['anomalie', 'vergleich'],
  tables: ['table', 'details'],
}

const SECTION_COMMAND_ALIASES: Partial<Record<DashboardSectionId, string[]>> = {
  limits: ['limits sektion', 'subscriptions sektion'],
  tokenAnalysis: ['token chart'],
  requestAnalysis: ['request chart', 'request donut'],
}

/** Normalizes command labels, aliases, and queries into comparable search text. */
export function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Returns the searchable text corpus for a command. */
export function getCommandSearchText(cmd: CommandItem) {
  return normalizeSearchValue(
    [cmd.label, cmd.description, ...(cmd.keywords ?? []), ...(cmd.aliases ?? [])]
      .filter(Boolean)
      .join(' '),
  )
}

/** Scores how well a command matches a query, returning zero for non-matches. */
export function getCommandSearchScore(cmd: CommandItem, query: string) {
  if (!query) return 1

  const normalizedQuery = normalizeSearchValue(query)
  if (!normalizedQuery) return 1

  const haystack = getCommandSearchText(cmd)
  const terms = normalizedQuery.split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 1

  let score = 0

  for (const term of terms) {
    if (!haystack.includes(term)) return 0

    if (normalizeSearchValue(cmd.label) === term) {
      score += 120
      continue
    }

    if (normalizeSearchValue(cmd.label).startsWith(term)) {
      score += 80
      continue
    }

    if ((cmd.aliases ?? []).some((alias) => normalizeSearchValue(alias) === term)) {
      score += 70
      continue
    }

    if ((cmd.keywords ?? []).some((keyword) => normalizeSearchValue(keyword).startsWith(term))) {
      score += 55
      continue
    }

    if (haystack.includes(` ${term}`) || haystack.startsWith(term)) {
      score += 35
      continue
    }

    score += 15
  }

  return score
}

/** Filters and ranks commands using the palette's deterministic search policy. */
export function filterCommandItems(commands: CommandItem[], search: string) {
  return commands
    .map((cmd, index) => ({ cmd, score: getCommandSearchScore(cmd, search), index }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.cmd)
}

/** Returns the commands that can be triggered by numeric quick-select shortcuts. */
export function getVisibleCommandItems(commands: CommandItem[]) {
  return commands.slice(0, 9)
}

/** Builds the per-section availability map from the current dashboard data state. */
export function buildSectionAvailability({
  hasMonthSection,
  hasRequestSection,
  hasTodaySection,
}: Pick<
  DashboardCommandPaletteViewModel,
  'hasMonthSection' | 'hasRequestSection' | 'hasTodaySection'
>): Record<DashboardSectionId, boolean> {
  return {
    insights: true,
    metrics: true,
    today: hasTodaySection,
    currentMonth: hasMonthSection,
    activity: true,
    forecastCache: true,
    limits: true,
    costAnalysis: true,
    tokenAnalysis: true,
    requestAnalysis: hasRequestSection,
    advancedAnalysis: true,
    comparisons: true,
    tables: true,
  }
}

/** Builds ordered dashboard-section navigation commands. */
export function buildSectionNavigationCommands({
  onScrollTo,
  sectionAvailability,
  sectionOrder,
  sectionVisibility,
  t,
}: SectionNavigationOptions): CommandItem[] {
  return sectionOrder.flatMap((sectionId) => {
    const section = DASHBOARD_SECTION_DEFINITION_MAP[sectionId]

    if (!sectionVisibility[sectionId] || !sectionAvailability[sectionId]) {
      return []
    }

    const sectionLabel = t(section.labelKey)

    return [
      {
        id: `section-${section.id}`,
        label: t('commandPalette.commands.goToSection.label', { section: sectionLabel }),
        description: t('commandPalette.commands.goToSection.description', {
          section: sectionLabel,
        }),
        keywords: [sectionLabel, section.domId, ...SECTION_COMMAND_KEYWORDS[section.id]],
        icon: SECTION_COMMAND_ICON_MAP[section.id],
        action: () => onScrollTo(section.domId),
        group: t('commandPalette.groups.navigation'),
        testId: `command-section-${section.id}`,
        ...(SECTION_COMMAND_ALIASES[section.id]
          ? { aliases: SECTION_COMMAND_ALIASES[section.id] }
          : {}),
      },
    ]
  })
}

/** Builds the complete command list for the current dashboard view model. */
export function buildCommandPaletteCommands({
  isDark,
  availableProviders,
  selectedProviders,
  availableModels,
  selectedModels,
  reportGenerating,
  onToggleTheme,
  onExportCSV,
  onGenerateReport,
  onDelete,
  onUpload,
  onAutoImport,
  onOpenSettings,
  onScrollTo,
  onScrollTop,
  onScrollBottom,
  onViewModeChange,
  onApplyPreset,
  onToggleProvider,
  onToggleModel,
  onClearProviders,
  onClearModels,
  onClearDateRange,
  onResetAll,
  onHelp,
  onLanguageChange,
  t,
  ...sectionInputs
}: CommandPaletteBuilderOptions): CommandItem[] {
  const sectionNavigationCommands = buildSectionNavigationCommands({
    onScrollTo,
    sectionAvailability: buildSectionAvailability(sectionInputs),
    sectionOrder: sectionInputs.sectionOrder,
    sectionVisibility: sectionInputs.sectionVisibility,
    t,
  })

  const baseCommands: CommandItem[] = [
    {
      id: 'auto-import',
      label: t('commandPalette.commands.autoImport.label'),
      description: t('commandPalette.commands.autoImport.description'),
      keywords: ['toktrack', 'import', 'load', 'sync'],
      aliases: ['auto import', 'daten importieren'],
      icon: <Zap className="h-4 w-4" />,
      action: onAutoImport,
      group: t('commandPalette.groups.loadData'),
    },
    {
      id: 'upload',
      label: t('commandPalette.commands.upload.label'),
      description: t('commandPalette.commands.upload.description'),
      keywords: ['upload', 'file', 'json', 'import'],
      aliases: ['datei laden', 'json import'],
      shortcut: '⌘U',
      icon: <Upload className="h-4 w-4" />,
      action: onUpload,
      group: t('commandPalette.groups.loadData'),
    },
    {
      id: 'csv',
      label: t('commandPalette.commands.exportCsv.label'),
      description: t('commandPalette.commands.exportCsv.description'),
      keywords: ['download', 'export', 'csv'],
      aliases: ['csv download', 'daten exportieren'],
      shortcut: '⌘E',
      icon: <Download className="h-4 w-4" />,
      action: onExportCSV,
      group: t('commandPalette.groups.exports'),
    },
    {
      id: 'report',
      label: reportGenerating
        ? t('commandPalette.commands.generateReport.labelLoading')
        : t('commandPalette.commands.generateReport.label'),
      description: t('commandPalette.commands.generateReport.description'),
      keywords: ['pdf', 'report', 'bericht', 'export'],
      aliases: ['report export', 'pdf export', 'bericht generieren'],
      icon: <Download className="h-4 w-4" />,
      action: onGenerateReport,
      group: t('commandPalette.groups.exports'),
    },
    {
      id: 'settings-open',
      label: t('commandPalette.commands.openSettings.label'),
      description: t('commandPalette.commands.openSettings.description'),
      keywords: ['settings', 'limits', 'subscription', 'anbieter limit', 'backup'],
      aliases: ['settings dialog', 'einstellungen öffnen', 'provider limits'],
      icon: <SlidersHorizontal className="h-4 w-4" />,
      action: onOpenSettings,
      group: t('commandPalette.groups.maintenance'),
    },
    {
      id: 'delete',
      label: t('commandPalette.commands.delete.label'),
      description: t('commandPalette.commands.delete.description'),
      keywords: ['reset data', 'clear data', 'delete'],
      aliases: ['daten reset', 'alles loeschen'],
      icon: <Trash2 className="h-4 w-4" />,
      action: onDelete,
      group: t('commandPalette.groups.maintenance'),
    },
    {
      id: 'view-daily',
      label: t('commandPalette.commands.viewDaily.label'),
      description: t('commandPalette.commands.viewDaily.description'),
      keywords: ['daily', 'tage', 'tag', 'tagesansicht'],
      aliases: ['daily view'],
      icon: <Calendar className="h-4 w-4" />,
      action: () => onViewModeChange('daily'),
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'view-monthly',
      label: t('commandPalette.commands.viewMonthly.label'),
      description: t('commandPalette.commands.viewMonthly.description'),
      keywords: ['monthly', 'monate', 'monat', 'monatsansicht'],
      aliases: ['monthly view'],
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => onViewModeChange('monthly'),
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'view-yearly',
      label: t('commandPalette.commands.viewYearly.label'),
      description: t('commandPalette.commands.viewYearly.description'),
      keywords: ['yearly', 'jahre', 'jahr', 'jahresansicht'],
      aliases: ['yearly view'],
      icon: <Layers3 className="h-4 w-4" />,
      action: () => onViewModeChange('yearly'),
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'preset-7d',
      label: t('commandPalette.commands.preset7d.label'),
      description: t('commandPalette.commands.preset7d.description'),
      keywords: ['7d', '7 tage'],
      icon: <CalendarRange className="h-4 w-4" />,
      action: () => onApplyPreset('7d'),
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'preset-30d',
      label: t('commandPalette.commands.preset30d.label'),
      description: t('commandPalette.commands.preset30d.description'),
      keywords: ['30d', '30 tage'],
      icon: <CalendarRange className="h-4 w-4" />,
      action: () => onApplyPreset('30d'),
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'preset-month',
      label: t('commandPalette.commands.presetMonth.label'),
      description: t('commandPalette.commands.presetMonth.description'),
      keywords: ['current month', 'monat'],
      icon: <CalendarRange className="h-4 w-4" />,
      action: () => onApplyPreset('month'),
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'preset-year',
      label: t('commandPalette.commands.presetYear.label'),
      description: t('commandPalette.commands.presetYear.description'),
      keywords: ['current year', 'jahr'],
      icon: <CalendarRange className="h-4 w-4" />,
      action: () => onApplyPreset('year'),
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'preset-all',
      label: t('commandPalette.commands.presetAll.label'),
      description: t('commandPalette.commands.presetAll.description'),
      keywords: ['all', 'alles'],
      icon: <RefreshCcw className="h-4 w-4" />,
      action: () => onApplyPreset('all'),
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'clear-providers',
      label: t('commandPalette.commands.clearProviders.label'),
      description: t('commandPalette.commands.clearProviders.description'),
      keywords: ['provider', 'anbieter', 'clear'],
      icon: <Filter className="h-4 w-4" />,
      action: onClearProviders,
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'clear-models',
      label: t('commandPalette.commands.clearModels.label'),
      description: t('commandPalette.commands.clearModels.description'),
      keywords: ['models', 'modelle', 'clear'],
      icon: <Filter className="h-4 w-4" />,
      action: onClearModels,
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'clear-dates',
      label: t('commandPalette.commands.clearDates.label'),
      description: t('commandPalette.commands.clearDates.description'),
      keywords: ['date', 'datum', 'range', 'clear'],
      icon: <RefreshCcw className="h-4 w-4" />,
      action: onClearDateRange,
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'reset-all',
      label: t('commandPalette.commands.resetAll.label'),
      description: t('commandPalette.commands.resetAll.description'),
      keywords: ['reset all', 'alles zurücksetzen', 'default', 'clear filters'],
      aliases: ['reset dashboard', 'alles reset', 'filter reset'],
      icon: <RefreshCcw className="h-4 w-4" />,
      action: onResetAll,
      group: t('commandPalette.groups.filters'),
    },
    {
      id: 'top',
      label: t('commandPalette.commands.scrollTop.label'),
      description: t('commandPalette.commands.scrollTop.description'),
      keywords: ['top', 'start', 'anfang'],
      shortcut: '⌘↑',
      icon: <ArrowUp className="h-4 w-4" />,
      action: onScrollTop,
      group: t('commandPalette.groups.navigation'),
    },
    {
      id: 'bottom',
      label: t('commandPalette.commands.scrollBottom.label'),
      description: t('commandPalette.commands.scrollBottom.description'),
      keywords: ['bottom', 'ende'],
      icon: <ArrowDown className="h-4 w-4" />,
      action: onScrollBottom,
      group: t('commandPalette.groups.navigation'),
    },
    {
      id: 'filters',
      label: t('commandPalette.commands.filters.label'),
      description: t('commandPalette.commands.filters.description'),
      keywords: ['filterbar', 'filter'],
      icon: <Filter className="h-4 w-4" />,
      action: () => onScrollTo('filters'),
      group: t('commandPalette.groups.navigation'),
    },
    ...sectionNavigationCommands,
    {
      id: 'theme',
      label: isDark
        ? t('commandPalette.commands.themeLight.label')
        : t('commandPalette.commands.themeDark.label'),
      description: t('commandPalette.commands.themeDark.description'),
      keywords: ['theme', 'dark', 'light'],
      shortcut: '⌘D',
      icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      action: onToggleTheme,
      group: t('commandPalette.groups.view'),
    },
    {
      id: 'language-de',
      label: t('commandPalette.commands.languageGerman.label'),
      description: t('commandPalette.commands.languageGerman.description'),
      keywords: ['language', 'sprache', 'deutsch', 'german', 'locale'],
      aliases: ['switch german', 'auf deutsch', 'sprache deutsch'],
      icon: <Languages className="h-4 w-4" />,
      action: () => onLanguageChange('de'),
      group: t('commandPalette.groups.language'),
    },
    {
      id: 'language-en',
      label: t('commandPalette.commands.languageEnglish.label'),
      description: t('commandPalette.commands.languageEnglish.description'),
      keywords: ['language', 'sprache', 'english', 'englisch', 'locale'],
      aliases: ['switch english', 'auf englisch', 'sprache english'],
      icon: <Languages className="h-4 w-4" />,
      action: () => onLanguageChange('en'),
      group: t('commandPalette.groups.language'),
    },
    {
      id: 'help',
      label: t('commandPalette.commands.help.label'),
      description: t('commandPalette.commands.help.description'),
      keywords: ['shortcut', 'hilfe'],
      shortcut: '?',
      icon: <CircleHelp className="h-4 w-4" />,
      action: onHelp,
      group: t('commandPalette.groups.help'),
    },
  ]

  const providerCommands: CommandItem[] = availableProviders.map((provider) => {
    const selected = selectedProviders.includes(provider)
    return {
      id: `provider-${provider}`,
      label: `${selected ? t('commandPalette.commands.clearProviders.label') : t('common.provider')}: ${provider}`,
      description: selected
        ? `${t('commandPalette.commands.clearProviders.description')}: ${provider}`
        : `${t('common.provider')} ${provider}`,
      keywords: ['anbieter', 'provider', provider.toLowerCase()],
      aliases: [`filter ${provider.toLowerCase()}`, `${provider.toLowerCase()} daten`],
      icon: <Filter className="h-4 w-4" />,
      action: () => onToggleProvider(provider),
      group: t('commandPalette.groups.providers'),
      testId: `command-provider-${provider}`,
    }
  })

  const modelCommands: CommandItem[] = availableModels.map((model) => {
    const selected = selectedModels.includes(model)
    return {
      id: `model-${model}`,
      label: `${selected ? t('commandPalette.commands.clearModels.label') : t('common.model')}: ${model}`,
      description: selected
        ? `${t('commandPalette.commands.clearModels.description')}: ${model}`
        : `${t('common.model')} ${model}`,
      keywords: ['modell', 'model', model.toLowerCase()],
      aliases: [
        `filter ${model.toLowerCase()}`,
        `${model.toLowerCase()} requests`,
        `${model.toLowerCase()} kosten`,
      ],
      icon: <Layers3 className="h-4 w-4" />,
      action: () => onToggleModel(model),
      group: t('commandPalette.groups.models'),
      testId: `command-model-${model}`,
    }
  })

  return [...baseCommands, ...providerCommands, ...modelCommands]
}
