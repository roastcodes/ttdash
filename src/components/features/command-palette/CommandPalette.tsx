import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Command } from 'cmdk'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Download, Trash2, Upload, Sun, Moon, Calendar, ChartBar,
  Table, Search, ArrowUp, CircleHelp, Zap, Filter, BarChart3,
  LineChart, Sigma, CalendarRange, Layers3, ArrowDown, RefreshCcw, SlidersHorizontal, Languages
} from 'lucide-react'
import type { AppLanguage, ViewMode } from '@/types'

interface CommandPaletteProps {
  isDark: boolean
  currentLanguage: AppLanguage
  availableProviders: string[]
  selectedProviders: string[]
  availableModels: string[]
  selectedModels: string[]
  hasTodaySection: boolean
  hasMonthSection: boolean
  reportGenerating: boolean
  onToggleTheme: () => void
  onExportCSV: () => void
  onGenerateReport: () => void
  onDelete: () => void
  onUpload: () => void
  onAutoImport: () => void
  onOpenSettings: () => void
  onScrollTo: (section: string) => void
  onViewModeChange: (mode: ViewMode) => void
  onApplyPreset: (preset: string) => void
  onToggleProvider: (provider: string) => void
  onToggleModel: (model: string) => void
  onClearProviders: () => void
  onClearModels: () => void
  onClearDateRange: () => void
  onResetAll: () => void
  onHelp: () => void
  onLanguageChange: (language: AppLanguage) => void
}

interface CommandItem {
  id: string
  label: string
  description?: string
  keywords?: string[]
  aliases?: string[]
  shortcut?: string
  icon: React.ReactNode
  action: () => void
  group: string
}

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function getCommandSearchText(cmd: CommandItem) {
  return normalizeSearchValue([
    cmd.label,
    cmd.description,
    ...(cmd.keywords ?? []),
    ...(cmd.aliases ?? []),
  ].filter(Boolean).join(' '))
}

function getCommandSearchScore(cmd: CommandItem, query: string) {
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

    if ((cmd.aliases ?? []).some(alias => normalizeSearchValue(alias) === term)) {
      score += 70
      continue
    }

    if ((cmd.keywords ?? []).some(keyword => normalizeSearchValue(keyword).startsWith(term))) {
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

export function CommandPalette({
  isDark,
  currentLanguage,
  availableProviders,
  selectedProviders,
  availableModels,
  selectedModels,
  hasTodaySection,
  hasMonthSection,
  reportGenerating,
  onToggleTheme,
  onExportCSV,
  onGenerateReport,
  onDelete,
  onUpload,
  onAutoImport,
  onOpenSettings,
  onScrollTo,
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
}: CommandPaletteProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const baseCommands: CommandItem[] = [
    { id: 'auto-import', label: t('commandPalette.commands.autoImport.label'), description: t('commandPalette.commands.autoImport.description'), keywords: ['toktrack', 'import', 'load', 'sync'], aliases: ['auto import', 'daten importieren'], icon: <Zap className="h-4 w-4" />, action: onAutoImport, group: t('commandPalette.groups.actions') },
    { id: 'settings-open', label: t('commandPalette.commands.openSettings.label'), description: t('commandPalette.commands.openSettings.description'), keywords: ['settings', 'limits', 'subscription', 'anbieter limit', 'backup'], aliases: ['settings dialog', 'einstellungen öffnen', 'provider limits'], icon: <SlidersHorizontal className="h-4 w-4" />, action: onOpenSettings, group: t('commandPalette.groups.actions') },
    { id: 'csv', label: t('commandPalette.commands.exportCsv.label'), description: t('commandPalette.commands.exportCsv.description'), keywords: ['download', 'export', 'csv'], aliases: ['csv download', 'daten exportieren'], shortcut: '⌘E', icon: <Download className="h-4 w-4" />, action: onExportCSV, group: t('commandPalette.groups.actions') },
    { id: 'report', label: reportGenerating ? t('commandPalette.commands.generateReport.labelLoading') : t('commandPalette.commands.generateReport.label'), description: t('commandPalette.commands.generateReport.description'), keywords: ['pdf', 'report', 'bericht', 'export'], aliases: ['report export', 'pdf export', 'bericht generieren'], icon: <Download className="h-4 w-4" />, action: onGenerateReport, group: t('commandPalette.groups.actions') },
    { id: 'upload', label: t('commandPalette.commands.upload.label'), description: t('commandPalette.commands.upload.description'), keywords: ['upload', 'file', 'json', 'import'], aliases: ['datei laden', 'json import'], shortcut: '⌘U', icon: <Upload className="h-4 w-4" />, action: onUpload, group: t('commandPalette.groups.actions') },
    { id: 'delete', label: t('commandPalette.commands.delete.label'), description: t('commandPalette.commands.delete.description'), keywords: ['reset data', 'clear data', 'delete'], aliases: ['daten reset', 'alles loeschen'], icon: <Trash2 className="h-4 w-4" />, action: onDelete, group: t('commandPalette.groups.actions') },

    { id: 'view-daily', label: t('commandPalette.commands.viewDaily.label'), description: t('commandPalette.commands.viewDaily.description'), keywords: ['daily', 'tage', 'tag', 'tagesansicht'], aliases: ['daily view'], icon: <Calendar className="h-4 w-4" />, action: () => onViewModeChange('daily'), group: t('commandPalette.groups.filters') },
    { id: 'view-monthly', label: t('commandPalette.commands.viewMonthly.label'), description: t('commandPalette.commands.viewMonthly.description'), keywords: ['monthly', 'monate', 'monat', 'monatsansicht'], aliases: ['monthly view'], icon: <BarChart3 className="h-4 w-4" />, action: () => onViewModeChange('monthly'), group: t('commandPalette.groups.filters') },
    { id: 'view-yearly', label: t('commandPalette.commands.viewYearly.label'), description: t('commandPalette.commands.viewYearly.description'), keywords: ['yearly', 'jahre', 'jahr', 'jahresansicht'], aliases: ['yearly view'], icon: <Layers3 className="h-4 w-4" />, action: () => onViewModeChange('yearly'), group: t('commandPalette.groups.filters') },
    { id: 'preset-7d', label: t('commandPalette.commands.preset7d.label'), description: t('commandPalette.commands.preset7d.description'), keywords: ['7d', '7 tage'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('7d'), group: t('commandPalette.groups.filters') },
    { id: 'preset-30d', label: t('commandPalette.commands.preset30d.label'), description: t('commandPalette.commands.preset30d.description'), keywords: ['30d', '30 tage'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('30d'), group: t('commandPalette.groups.filters') },
    { id: 'preset-month', label: t('commandPalette.commands.presetMonth.label'), description: t('commandPalette.commands.presetMonth.description'), keywords: ['current month', 'monat'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('month'), group: t('commandPalette.groups.filters') },
    { id: 'preset-year', label: t('commandPalette.commands.presetYear.label'), description: t('commandPalette.commands.presetYear.description'), keywords: ['current year', 'jahr'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('year'), group: t('commandPalette.groups.filters') },
    { id: 'preset-all', label: t('commandPalette.commands.presetAll.label'), description: t('commandPalette.commands.presetAll.description'), keywords: ['all', 'alles'], icon: <RefreshCcw className="h-4 w-4" />, action: () => onApplyPreset('all'), group: t('commandPalette.groups.filters') },
    { id: 'clear-providers', label: t('commandPalette.commands.clearProviders.label'), description: t('commandPalette.commands.clearProviders.description'), keywords: ['provider', 'anbieter', 'clear'], icon: <Filter className="h-4 w-4" />, action: onClearProviders, group: t('commandPalette.groups.filters') },
    { id: 'clear-models', label: t('commandPalette.commands.clearModels.label'), description: t('commandPalette.commands.clearModels.description'), keywords: ['models', 'modelle', 'clear'], icon: <Filter className="h-4 w-4" />, action: onClearModels, group: t('commandPalette.groups.filters') },
    { id: 'clear-dates', label: t('commandPalette.commands.clearDates.label'), description: t('commandPalette.commands.clearDates.description'), keywords: ['date', 'datum', 'range', 'clear'], icon: <RefreshCcw className="h-4 w-4" />, action: onClearDateRange, group: t('commandPalette.groups.filters') },
    { id: 'reset-all', label: t('commandPalette.commands.resetAll.label'), description: t('commandPalette.commands.resetAll.description'), keywords: ['reset all', 'alles zurücksetzen', 'default', 'clear filters'], aliases: ['reset dashboard', 'alles reset', 'filter reset'], icon: <RefreshCcw className="h-4 w-4" />, action: onResetAll, group: t('commandPalette.groups.filters') },

    { id: 'top', label: t('commandPalette.commands.scrollTop.label'), description: t('commandPalette.commands.scrollTop.description'), keywords: ['top', 'start', 'anfang'], shortcut: '⌘↑', icon: <ArrowUp className="h-4 w-4" />, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }), group: t('commandPalette.groups.navigation') },
    { id: 'bottom', label: t('commandPalette.commands.scrollBottom.label'), description: t('commandPalette.commands.scrollBottom.description'), keywords: ['bottom', 'ende'], icon: <ArrowDown className="h-4 w-4" />, action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), group: t('commandPalette.groups.navigation') },
    { id: 'filters', label: t('commandPalette.commands.filters.label'), description: t('commandPalette.commands.filters.description'), keywords: ['filterbar', 'filter'], icon: <Filter className="h-4 w-4" />, action: () => onScrollTo('filters'), group: t('commandPalette.groups.navigation') },
    { id: 'insights', label: t('commandPalette.commands.insights.label'), description: t('commandPalette.commands.insights.description'), keywords: ['summary', 'insight'], icon: <Sigma className="h-4 w-4" />, action: () => onScrollTo('insights'), group: t('commandPalette.groups.navigation') },
    { id: 'metrics', label: t('commandPalette.commands.metrics.label'), description: t('commandPalette.commands.metrics.description'), keywords: ['kpi', 'zahlen'], icon: <ChartBar className="h-4 w-4" />, action: () => onScrollTo('metrics'), group: t('commandPalette.groups.navigation') },
    ...(hasTodaySection ? [{ id: 'today', label: t('commandPalette.commands.today.label'), description: t('commandPalette.commands.today.description'), keywords: ['today', 'heute'], icon: <Calendar className="h-4 w-4" />, action: () => onScrollTo('today'), group: t('commandPalette.groups.navigation') } satisfies CommandItem] : []),
    ...(hasMonthSection ? [{ id: 'month', label: t('commandPalette.commands.month.label'), description: t('commandPalette.commands.month.description'), keywords: ['monat', 'current month'], icon: <CalendarRange className="h-4 w-4" />, action: () => onScrollTo('current-month'), group: t('commandPalette.groups.navigation') } satisfies CommandItem] : []),
    { id: 'activity', label: t('commandPalette.commands.activity.label'), description: t('commandPalette.commands.activity.description'), keywords: ['heatmap', 'aktivität'], icon: <Calendar className="h-4 w-4" />, action: () => onScrollTo('activity'), group: t('commandPalette.groups.navigation') },
    { id: 'forecast-cache', label: t('commandPalette.commands.forecastCache.label'), description: t('commandPalette.commands.forecastCache.description'), keywords: ['forecast', 'cache', 'roi'], icon: <LineChart className="h-4 w-4" />, action: () => onScrollTo('forecast-cache'), group: t('commandPalette.groups.navigation') },
    { id: 'limits', label: t('commandPalette.commands.limits.label'), description: t('commandPalette.commands.limits.description'), keywords: ['limits', 'subscriptions', 'budget', 'anbieter limits'], aliases: ['limits sektion', 'subscriptions sektion'], icon: <SlidersHorizontal className="h-4 w-4" />, action: () => onScrollTo('limits'), group: t('commandPalette.groups.navigation') },
    { id: 'charts', label: t('commandPalette.commands.charts.label'), description: t('commandPalette.commands.charts.description'), keywords: ['charts', 'kostenanalyse'], icon: <BarChart3 className="h-4 w-4" />, action: () => onScrollTo('charts'), group: t('commandPalette.groups.navigation') },
    { id: 'token-analysis', label: t('commandPalette.commands.tokenAnalysis.label'), description: t('commandPalette.commands.tokenAnalysis.description'), keywords: ['tokens', 'token analyse'], aliases: ['token chart'], icon: <Layers3 className="h-4 w-4" />, action: () => onScrollTo('token-analysis'), group: t('commandPalette.groups.navigation') },
    { id: 'request-analysis', label: t('commandPalette.commands.requestAnalysis.label'), description: t('commandPalette.commands.requestAnalysis.description'), keywords: ['requests', 'request analyse', 'anfragen'], aliases: ['request chart', 'request donut'], icon: <LineChart className="h-4 w-4" />, action: () => onScrollTo('request-analysis'), group: t('commandPalette.groups.navigation') },
    { id: 'comparisons', label: t('commandPalette.commands.comparisons.label'), description: t('commandPalette.commands.comparisons.description'), keywords: ['anomalie', 'vergleich'], icon: <LineChart className="h-4 w-4" />, action: () => onScrollTo('comparisons'), group: t('commandPalette.groups.navigation') },
    { id: 'tables', label: t('commandPalette.commands.tables.label'), description: t('commandPalette.commands.tables.description'), keywords: ['table', 'details'], icon: <Table className="h-4 w-4" />, action: () => onScrollTo('tables'), group: t('commandPalette.groups.navigation') },

    { id: 'theme', label: isDark ? t('commandPalette.commands.themeLight.label') : t('commandPalette.commands.themeDark.label'), description: t('commandPalette.commands.themeDark.description'), keywords: ['theme', 'dark', 'light'], shortcut: '⌘D', icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, action: onToggleTheme, group: t('commandPalette.groups.view') },
    { id: 'language-de', label: t('commandPalette.commands.languageGerman.label'), description: t('commandPalette.commands.languageGerman.description'), keywords: ['language', 'sprache', 'deutsch', 'german', 'locale'], aliases: ['switch german', 'auf deutsch', 'sprache deutsch'], icon: <Languages className="h-4 w-4" />, action: () => onLanguageChange('de'), group: t('commandPalette.groups.language') },
    { id: 'language-en', label: t('commandPalette.commands.languageEnglish.label'), description: t('commandPalette.commands.languageEnglish.description'), keywords: ['language', 'sprache', 'english', 'englisch', 'locale'], aliases: ['switch english', 'auf englisch', 'sprache english'], icon: <Languages className="h-4 w-4" />, action: () => onLanguageChange('en'), group: t('commandPalette.groups.language') },
    { id: 'help', label: t('commandPalette.commands.help.label'), description: t('commandPalette.commands.help.description'), keywords: ['shortcut', 'hilfe'], shortcut: '?', icon: <CircleHelp className="h-4 w-4" />, action: onHelp, group: t('commandPalette.groups.help') },
  ]

  const providerCommands = useMemo<CommandItem[]>(() => (
    availableProviders.map(provider => {
      const selected = selectedProviders.includes(provider)
      return {
        id: `provider-${provider}`,
        label: `${selected ? t('commandPalette.commands.clearProviders.label') : t('common.provider')}: ${provider}`,
        description: selected ? `${t('commandPalette.commands.clearProviders.description')}: ${provider}` : `${t('common.provider')} ${provider}`,
        keywords: ['anbieter', 'provider', provider.toLowerCase()],
        aliases: [`filter ${provider.toLowerCase()}`, `${provider.toLowerCase()} daten`],
        icon: <Filter className="h-4 w-4" />,
        action: () => onToggleProvider(provider),
        group: t('commandPalette.groups.providers'),
      }
    })
  ), [availableProviders, selectedProviders, onToggleProvider, t])

  const modelCommands = useMemo<CommandItem[]>(() => (
    availableModels.map(model => {
      const selected = selectedModels.includes(model)
      return {
        id: `model-${model}`,
        label: `${selected ? t('commandPalette.commands.clearModels.label') : t('common.model')}: ${model}`,
        description: selected ? `${t('commandPalette.commands.clearModels.description')}: ${model}` : `${t('common.model')} ${model}`,
        keywords: ['modell', 'model', model.toLowerCase()],
        aliases: [`filter ${model.toLowerCase()}`, `${model.toLowerCase()} requests`, `${model.toLowerCase()} kosten`],
        icon: <Layers3 className="h-4 w-4" />,
        action: () => onToggleModel(model),
        group: t('commandPalette.groups.models'),
      }
    })
  ), [availableModels, selectedModels, onToggleModel, t])

  const commands = useMemo(() => [
    ...baseCommands,
    ...providerCommands,
    ...modelCommands,
  ], [baseCommands, providerCommands, modelCommands, currentLanguage])

  const filteredCommands = useMemo(() => (
    commands
      .map((cmd, index) => ({ cmd, score: getCommandSearchScore(cmd, search), index }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map(entry => entry.cmd)
  ), [commands, search])

  const visibleCommands = useMemo(() => filteredCommands.slice(0, 9), [filteredCommands])
  const groups = useMemo(() => Array.from(new Set(filteredCommands.map(c => c.group))), [filteredCommands])

  const runCommand = (cmd: CommandItem) => {
    setOpen(false)
    setSearch('')
    cmd.action()
  }

  useEffect(() => {
    if (!open) return

    const handleQuickSelect = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (!/^[1-9]$/.test(e.key)) return

      const index = Number(e.key) - 1
      const command = visibleCommands[index]
      if (!command) return

      e.preventDefault()
      runCommand(command)
    }

    document.addEventListener('keydown', handleQuickSelect)
    return () => document.removeEventListener('keydown', handleQuickSelect)
  }, [open, visibleCommands])

  useEffect(() => {
    if (!open && search) {
      setSearch('')
    }
  }, [open, search])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-md overflow-hidden">
        <DialogTitle className="sr-only">{t('commandPalette.title')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('commandPalette.description')}
        </DialogDescription>
        <Command className="bg-transparent" shouldFilter={false}>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder={t('commandPalette.placeholder')}
              value={search}
              onValueChange={setSearch}
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {t('commandPalette.empty')}
            </Command.Empty>
            {groups.map(group => (
              <Command.Group key={group} heading={group} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                {filteredCommands.filter(c => c.group === group).map(cmd => {
                  const quickIndex = visibleCommands.findIndex(visible => visible.id === cmd.id)

                  return (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.id}
                    onSelect={() => runCommand(cmd)}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent"
                  >
                    {cmd.icon}
                    <div className="flex-1 min-w-0">
                      <div>{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {quickIndex >= 0 && (
                      <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground min-w-6">
                        {quickIndex + 1}
                      </kbd>
                    )}
                  </Command.Item>
                )})}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
