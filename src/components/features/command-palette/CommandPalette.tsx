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
  onToggleTheme: () => void
  onExportCSV: () => void
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
  shortcut?: string
  icon: React.ReactNode
  action: () => void
  group: string
}

export function CommandPalette({
  isDark,
  availableProviders,
  selectedProviders,
  availableModels,
  selectedModels,
  hasTodaySection,
  hasMonthSection,
  onToggleTheme,
  onExportCSV,
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
    { id: 'auto-import', label: 'Auto-Import starten', description: 'Lokalen toktrack Import ausführen', keywords: ['toktrack', 'import', 'load'], icon: <Zap className="h-4 w-4" />, action: onAutoImport, group: 'Aktionen' },
    { id: 'csv', label: 'CSV exportieren', description: 'Aktuell gefilterte Daten exportieren', keywords: ['download', 'export'], shortcut: '⌘E', icon: <Download className="h-4 w-4" />, action: onExportCSV, group: 'Aktionen' },
    { id: 'upload', label: 'JSON hochladen', description: 'toktrack oder Legacy JSON importieren', keywords: ['upload', 'file', 'json'], shortcut: '⌘U', icon: <Upload className="h-4 w-4" />, action: onUpload, group: 'Aktionen' },
    { id: 'delete', label: 'Daten löschen', description: 'Lokalen Datensatz entfernen', keywords: ['reset data', 'clear data'], icon: <Trash2 className="h-4 w-4" />, action: onDelete, group: 'Aktionen' },

    { id: 'view-daily', label: 'Zur Tagesansicht wechseln', description: 'Daten pro Tag anzeigen', keywords: ['daily', 'tage'], icon: <Calendar className="h-4 w-4" />, action: () => onViewModeChange('daily'), group: 'Filter & Ansicht' },
    { id: 'view-monthly', label: 'Zur Monatsansicht wechseln', description: 'Daten pro Monat anzeigen', keywords: ['monthly', 'monate'], icon: <BarChart3 className="h-4 w-4" />, action: () => onViewModeChange('monthly'), group: 'Filter & Ansicht' },
    { id: 'view-yearly', label: 'Zur Jahresansicht wechseln', description: 'Daten pro Jahr anzeigen', keywords: ['yearly', 'jahre'], icon: <Layers3 className="h-4 w-4" />, action: () => onViewModeChange('yearly'), group: 'Filter & Ansicht' },
    { id: 'preset-7d', label: 'Zeitraum: letzte 7 Tage', description: 'Setzt den Datumsfilter auf 7 Tage', keywords: ['7d', '7 tage'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('7d'), group: 'Filter & Ansicht' },
    { id: 'preset-30d', label: 'Zeitraum: letzte 30 Tage', description: 'Setzt den Datumsfilter auf 30 Tage', keywords: ['30d', '30 tage'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('30d'), group: 'Filter & Ansicht' },
    { id: 'preset-month', label: 'Zeitraum: aktueller Monat', description: 'Setzt den Datumsfilter auf den laufenden Monat', keywords: ['current month', 'monat'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('month'), group: 'Filter & Ansicht' },
    { id: 'preset-year', label: 'Zeitraum: aktuelles Jahr', description: 'Setzt den Datumsfilter auf das laufende Jahr', keywords: ['current year', 'jahr'], icon: <CalendarRange className="h-4 w-4" />, action: () => onApplyPreset('year'), group: 'Filter & Ansicht' },
    { id: 'preset-all', label: 'Zeitraum: alle Daten', description: 'Entfernt Preset-Zeitraumfilter', keywords: ['all', 'alles'], icon: <RefreshCcw className="h-4 w-4" />, action: () => onApplyPreset('all'), group: 'Filter & Ansicht' },
    { id: 'clear-providers', label: 'Anbieterfilter zurücksetzen', description: 'Alle aktiven Anbieterfilter entfernen', keywords: ['provider', 'anbieter', 'clear'], icon: <Filter className="h-4 w-4" />, action: onClearProviders, group: 'Filter & Ansicht' },
    { id: 'clear-models', label: 'Modellfilter zurücksetzen', description: 'Alle aktiven Modellfilter entfernen', keywords: ['models', 'modelle', 'clear'], icon: <Filter className="h-4 w-4" />, action: onClearModels, group: 'Filter & Ansicht' },
    { id: 'clear-dates', label: 'Datumsfilter zurücksetzen', description: 'Start- und Enddatum entfernen', keywords: ['date', 'datum', 'range', 'clear'], icon: <RefreshCcw className="h-4 w-4" />, action: onClearDateRange, group: 'Filter & Ansicht' },

    { id: 'top', label: 'Nach oben scrollen', description: 'Zum Seitenanfang springen', keywords: ['top', 'start'], shortcut: '⌘↑', icon: <ArrowUp className="h-4 w-4" />, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }), group: 'Navigation' },
    { id: 'bottom', label: 'Nach unten scrollen', description: 'Zum Seitenende springen', keywords: ['bottom', 'ende'], icon: <ArrowDown className="h-4 w-4" />, action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), group: 'Navigation' },
    { id: 'filters', label: 'Zu Filtern', description: 'Springt zur Filterleiste', keywords: ['filterbar', 'filter'], icon: <Filter className="h-4 w-4" />, action: () => onScrollTo('filters'), group: 'Navigation' },
    { id: 'insights', label: 'Zu Insights', description: 'Springt zur Executive Summary', keywords: ['summary', 'insight'], icon: <Sigma className="h-4 w-4" />, action: () => onScrollTo('insights'), group: 'Navigation' },
    { id: 'metrics', label: 'Zu Metriken', description: 'Springt zu den KPI-Karten', keywords: ['kpi', 'zahlen'], icon: <ChartBar className="h-4 w-4" />, action: () => onScrollTo('metrics'), group: 'Navigation' },
    ...(hasTodaySection ? [{ id: 'today', label: 'Zu Heute', description: 'Springt zu den KPIs des aktuellen Tages', keywords: ['today', 'heute'], icon: <Calendar className="h-4 w-4" />, action: () => onScrollTo('today'), group: 'Navigation' } satisfies CommandItem] : []),
    ...(hasMonthSection ? [{ id: 'month', label: 'Zu Monat', description: 'Springt zu den KPIs des aktuellen Monats', keywords: ['monat', 'current month'], icon: <CalendarRange className="h-4 w-4" />, action: () => onScrollTo('current-month'), group: 'Navigation' } satisfies CommandItem] : []),
    { id: 'activity', label: 'Zu Aktivität', description: 'Springt zur Aktivitäts-Heatmap', keywords: ['heatmap', 'aktivität'], icon: <Calendar className="h-4 w-4" />, action: () => onScrollTo('activity'), group: 'Navigation' },
    { id: 'forecast-cache', label: 'Zu Prognose & Cache', description: 'Springt zu Forecast und Cache ROI', keywords: ['forecast', 'cache', 'roi'], icon: <LineChart className="h-4 w-4" />, action: () => onScrollTo('forecast-cache'), group: 'Navigation' },
    { id: 'charts', label: 'Zu Kostenanalyse', description: 'Springt zu den Kostencharts', keywords: ['charts', 'kostenanalyse'], icon: <BarChart3 className="h-4 w-4" />, action: () => onScrollTo('charts'), group: 'Navigation' },
    { id: 'token-analysis', label: 'Zu Token-Analyse', description: 'Springt zu Token-Charts und Verteilungen', keywords: ['tokens'], icon: <Layers3 className="h-4 w-4" />, action: () => onScrollTo('token-analysis'), group: 'Navigation' },
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

  const groups = Array.from(new Set(commands.map(c => c.group)))

  const runCommand = (cmd: CommandItem) => {
    setOpen(false)
    cmd.action()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-md overflow-hidden">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Tastaturgesteuerte Befehlsauswahl für Navigation und Aktionen im ttdash Dashboard.
        </DialogDescription>
        <Command className="bg-transparent">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Befehl suchen..."
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Kein Befehl gefunden.
            </Command.Empty>
            {groups.map(group => (
              <Command.Group key={group} heading={group} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                {commands.filter(c => c.group === group).map(cmd => (
                  <Command.Item
                    key={cmd.id}
                    value={[cmd.label, cmd.description, ...(cmd.keywords ?? [])].filter(Boolean).join(' ')}
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
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
