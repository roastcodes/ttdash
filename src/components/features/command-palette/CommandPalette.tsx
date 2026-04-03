import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Download, Trash2, Upload, Sun, Moon, Calendar, ChartBar,
  Table, Search, ArrowUp, CircleHelp, Zap, Filter, BarChart3,
  LineChart, Sigma, CalendarRange, Layers3, ArrowDown, RefreshCcw
} from 'lucide-react'
import type { ViewMode } from '@/types'

interface CommandPaletteProps {
  isDark: boolean
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
  onScrollTo: (section: string) => void
  onViewModeChange: (mode: ViewMode) => void
  onApplyPreset: (preset: string) => void
  onToggleProvider: (provider: string) => void
  onToggleModel: (model: string) => void
  onClearProviders: () => void
  onClearModels: () => void
  onClearDateRange: () => void
  onHelp: () => void
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
  onScrollTo,
  onViewModeChange,
  onApplyPreset,
  onToggleProvider,
  onToggleModel,
  onClearProviders,
  onClearModels,
  onClearDateRange,
  onHelp,
}: CommandPaletteProps) {
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
    { id: 'auto-import', label: 'Auto-Import starten', description: 'Lokalen toktrack Import ausführen', keywords: ['toktrack', 'import', 'load', 'sync'], aliases: ['auto import', 'daten importieren'], icon: <Zap className="h-4 w-4" />, action: onAutoImport, group: 'Aktionen' },
    { id: 'csv', label: 'CSV exportieren', description: 'Aktuell gefilterte Daten exportieren', keywords: ['download', 'export', 'csv'], aliases: ['csv download', 'daten exportieren'], shortcut: '⌘E', icon: <Download className="h-4 w-4" />, action: onExportCSV, group: 'Aktionen' },
    { id: 'report', label: reportGenerating ? 'PDF-Report wird generiert' : 'PDF-Report generieren', description: 'Aktuell gefilterte Daten als PDF exportieren', keywords: ['pdf', 'report', 'bericht', 'export'], aliases: ['report export', 'pdf export', 'bericht generieren'], icon: <Download className="h-4 w-4" />, action: onGenerateReport, group: 'Aktionen' },
    { id: 'upload', label: 'JSON hochladen', description: 'toktrack oder Legacy JSON importieren', keywords: ['upload', 'file', 'json', 'import'], aliases: ['datei laden', 'json import'], shortcut: '⌘U', icon: <Upload className="h-4 w-4" />, action: onUpload, group: 'Aktionen' },
    { id: 'delete', label: 'Daten löschen', description: 'Lokalen Datensatz entfernen', keywords: ['reset data', 'clear data', 'delete'], aliases: ['daten reset', 'alles loeschen'], icon: <Trash2 className="h-4 w-4" />, action: onDelete, group: 'Aktionen' },

    { id: 'view-daily', label: 'Zur Tagesansicht wechseln', description: 'Daten pro Tag anzeigen', keywords: ['daily', 'tage', 'tag', 'tagesansicht'], aliases: ['daily view'], icon: <Calendar className="h-4 w-4" />, action: () => onViewModeChange('daily'), group: 'Filter & Ansicht' },
    { id: 'view-monthly', label: 'Zur Monatsansicht wechseln', description: 'Daten pro Monat anzeigen', keywords: ['monthly', 'monate', 'monat', 'monatsansicht'], aliases: ['monthly view'], icon: <BarChart3 className="h-4 w-4" />, action: () => onViewModeChange('monthly'), group: 'Filter & Ansicht' },
    { id: 'view-yearly', label: 'Zur Jahresansicht wechseln', description: 'Daten pro Jahr anzeigen', keywords: ['yearly', 'jahre', 'jahr', 'jahresansicht'], aliases: ['yearly view'], icon: <Layers3 className="h-4 w-4" />, action: () => onViewModeChange('yearly'), group: 'Filter & Ansicht' },
    { id: 'preset-7d', label: 'Zeitraum: letzte 7 Tage', description: 'Setzt den Datumsfilter auf 7 Tage', keywords: ['7d', '7 tage'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('7d'), group: 'Filter & Ansicht' },
    { id: 'preset-30d', label: 'Zeitraum: letzte 30 Tage', description: 'Setzt den Datumsfilter auf 30 Tage', keywords: ['30d', '30 tage'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('30d'), group: 'Filter & Ansicht' },
    { id: 'preset-month', label: 'Zeitraum: aktueller Monat', description: 'Setzt den Datumsfilter auf den laufenden Monat', keywords: ['current month', 'monat'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('month'), group: 'Filter & Ansicht' },
    { id: 'preset-year', label: 'Zeitraum: aktuelles Jahr', description: 'Setzt den Datumsfilter auf das laufende Jahr', keywords: ['current year', 'jahr'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('year'), group: 'Filter & Ansicht' },
    { id: 'preset-all', label: 'Zeitraum: alle Daten', description: 'Entfernt Preset-Zeitraumfilter', keywords: ['all', 'alles'], icon: <RefreshCcw className="h-4 w-4" />, action: () => onApplyPreset('all'), group: 'Filter & Ansicht' },
    { id: 'clear-providers', label: 'Anbieterfilter zurücksetzen', description: 'Alle aktiven Anbieterfilter entfernen', keywords: ['provider', 'anbieter', 'clear'], icon: <Filter className="h-4 w-4" />, action: onClearProviders, group: 'Filter & Ansicht' },
    { id: 'clear-models', label: 'Modellfilter zurücksetzen', description: 'Alle aktiven Modellfilter entfernen', keywords: ['models', 'modelle', 'clear'], icon: <Filter className="h-4 w-4" />, action: onClearModels, group: 'Filter & Ansicht' },
    { id: 'clear-dates', label: 'Datumsfilter zurücksetzen', description: 'Start- und Enddatum entfernen', keywords: ['date', 'datum', 'range', 'clear'], icon: <RefreshCcw className="h-4 w-4" />, action: onClearDateRange, group: 'Filter & Ansicht' },

    { id: 'top', label: 'Nach oben scrollen', description: 'Zum Seitenanfang springen', keywords: ['top', 'start', 'anfang'], shortcut: '⌘↑', icon: <ArrowUp className="h-4 w-4" />, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }), group: 'Navigation' },
    { id: 'bottom', label: 'Nach unten scrollen', description: 'Zum Seitenende springen', keywords: ['bottom', 'ende'], icon: <ArrowDown className="h-4 w-4" />, action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), group: 'Navigation' },
    { id: 'filters', label: 'Zu Filtern', description: 'Springt zur Filterleiste', keywords: ['filterbar', 'filter'], icon: <Filter className="h-4 w-4" />, action: () => onScrollTo('filters'), group: 'Navigation' },
    { id: 'insights', label: 'Zu Insights', description: 'Springt zur Executive Summary', keywords: ['summary', 'insight'], icon: <Sigma className="h-4 w-4" />, action: () => onScrollTo('insights'), group: 'Navigation' },
    { id: 'metrics', label: 'Zu Metriken', description: 'Springt zu den KPI-Karten', keywords: ['kpi', 'zahlen'], icon: <ChartBar className="h-4 w-4" />, action: () => onScrollTo('metrics'), group: 'Navigation' },
    ...(hasTodaySection ? [{ id: 'today', label: 'Zu Heute', description: 'Springt zu den KPIs des aktuellen Tages', keywords: ['today', 'heute'], icon: <Calendar className="h-4 w-4" />, action: () => onScrollTo('today'), group: 'Navigation' } satisfies CommandItem] : []),
    ...(hasMonthSection ? [{ id: 'month', label: 'Zu Monat', description: 'Springt zu den KPIs des aktuellen Monats', keywords: ['monat', 'current month'], icon: <CalendarRange className="h-4 w-4" />, action: () => onScrollTo('current-month'), group: 'Navigation' } satisfies CommandItem] : []),
    { id: 'activity', label: 'Zu Aktivität', description: 'Springt zur Aktivitäts-Heatmap', keywords: ['heatmap', 'aktivität'], icon: <Calendar className="h-4 w-4" />, action: () => onScrollTo('activity'), group: 'Navigation' },
    { id: 'forecast-cache', label: 'Zu Prognose & Cache', description: 'Springt zu Forecast und Cache ROI', keywords: ['forecast', 'cache', 'roi'], icon: <LineChart className="h-4 w-4" />, action: () => onScrollTo('forecast-cache'), group: 'Navigation' },
    { id: 'charts', label: 'Zu Kostenanalyse', description: 'Springt zu den Kostencharts', keywords: ['charts', 'kostenanalyse'], icon: <BarChart3 className="h-4 w-4" />, action: () => onScrollTo('charts'), group: 'Navigation' },
    { id: 'token-analysis', label: 'Zu Token-Analyse', description: 'Springt zu Token-Charts und Verteilungen', keywords: ['tokens', 'token analyse'], aliases: ['token chart'], icon: <Layers3 className="h-4 w-4" />, action: () => onScrollTo('token-analysis'), group: 'Navigation' },
    { id: 'request-analysis', label: 'Zu Request-Analyse', description: 'Springt zu Requests im Zeitverlauf und Request-Verteilung', keywords: ['requests', 'request analyse', 'anfragen'], aliases: ['request chart', 'request donut'], icon: <LineChart className="h-4 w-4" />, action: () => onScrollTo('request-analysis'), group: 'Navigation' },
    { id: 'comparisons', label: 'Zu Vergleiche & Anomalien', description: 'Springt zu Periodenvergleich und Auffälligkeiten', keywords: ['anomalie', 'vergleich'], icon: <LineChart className="h-4 w-4" />, action: () => onScrollTo('comparisons'), group: 'Navigation' },
    { id: 'tables', label: 'Zu Tabellen', description: 'Springt zu den Detailtabellen', keywords: ['table', 'details'], icon: <Table className="h-4 w-4" />, action: () => onScrollTo('tables'), group: 'Navigation' },

    { id: 'theme', label: isDark ? 'Light Mode aktivieren' : 'Dark Mode aktivieren', description: 'Zwischen hellem und dunklem Theme wechseln', keywords: ['theme', 'dark', 'light'], shortcut: '⌘D', icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, action: onToggleTheme, group: 'Ansicht' },
    { id: 'help', label: 'Hilfe & Tastenkürzel öffnen', description: 'Öffnet die Hilfeübersicht', keywords: ['shortcut', 'hilfe'], shortcut: '?', icon: <CircleHelp className="h-4 w-4" />, action: onHelp, group: 'Hilfe' },
  ]

  const providerCommands = useMemo<CommandItem[]>(() => (
    availableProviders.map(provider => {
      const selected = selectedProviders.includes(provider)
      return {
        id: `provider-${provider}`,
        label: `${selected ? 'Anbieter deaktivieren' : 'Anbieter filtern'}: ${provider}`,
        description: selected ? `Entfernt den aktiven Filter für ${provider}` : `Filtert das Dashboard nach ${provider}`,
        keywords: ['anbieter', 'provider', provider.toLowerCase()],
        aliases: [`filter ${provider.toLowerCase()}`, `${provider.toLowerCase()} daten`],
        icon: <Filter className="h-4 w-4" />,
        action: () => onToggleProvider(provider),
        group: 'Anbieter',
      }
    })
  ), [availableProviders, selectedProviders, onToggleProvider])

  const modelCommands = useMemo<CommandItem[]>(() => (
    availableModels.map(model => {
      const selected = selectedModels.includes(model)
      return {
        id: `model-${model}`,
        label: `${selected ? 'Modell deaktivieren' : 'Modell filtern'}: ${model}`,
        description: selected ? `Entfernt den aktiven Filter für ${model}` : `Filtert das Dashboard nach ${model}`,
        keywords: ['modell', 'model', model.toLowerCase()],
        aliases: [`filter ${model.toLowerCase()}`, `${model.toLowerCase()} requests`, `${model.toLowerCase()} kosten`],
        icon: <Layers3 className="h-4 w-4" />,
        action: () => onToggleModel(model),
        group: 'Modelle',
      }
    })
  ), [availableModels, selectedModels, onToggleModel])

  const commands = useMemo(() => [
    ...baseCommands,
    ...providerCommands,
    ...modelCommands,
  ], [baseCommands, providerCommands, modelCommands])

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
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Tastaturgesteuerte Befehlsauswahl für Navigation und Aktionen im ttdash Dashboard.
        </DialogDescription>
        <Command className="bg-transparent" shouldFilter={false}>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Befehl suchen..."
              value={search}
              onValueChange={setSearch}
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Kein Befehl gefunden.
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
