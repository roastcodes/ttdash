import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Download, Trash2, Upload, Sun, Moon, Calendar, ChartBar,
  Table, Search, ArrowUp, CircleHelp, Zap
} from 'lucide-react'

interface CommandPaletteProps {
  isDark: boolean
  onToggleTheme: () => void
  onExportCSV: () => void
  onDelete: () => void
  onUpload: () => void
  onAutoImport: () => void
  onScrollTo: (section: string) => void
  onHelp: () => void
}

interface CommandItem {
  id: string
  label: string
  shortcut?: string
  icon: React.ReactNode
  action: () => void
  group: string
}

export function CommandPalette({ isDark, onToggleTheme, onExportCSV, onDelete, onUpload, onAutoImport, onScrollTo, onHelp }: CommandPaletteProps) {
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

  const commands: CommandItem[] = [
    { id: 'auto-import', label: 'Auto-Import', icon: <Zap className="h-4 w-4" />, action: onAutoImport, group: 'Aktionen' },
    { id: 'csv', label: 'CSV exportieren', shortcut: '⌘E', icon: <Download className="h-4 w-4" />, action: onExportCSV, group: 'Aktionen' },
    { id: 'upload', label: 'Daten hochladen', shortcut: '⌘U', icon: <Upload className="h-4 w-4" />, action: onUpload, group: 'Aktionen' },
    { id: 'delete', label: 'Daten löschen', icon: <Trash2 className="h-4 w-4" />, action: onDelete, group: 'Aktionen' },
    { id: 'theme', label: isDark ? 'Light Mode' : 'Dark Mode', shortcut: '⌘D', icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, action: onToggleTheme, group: 'Ansicht' },
    { id: 'top', label: 'Nach oben scrollen', shortcut: '⌘↑', icon: <ArrowUp className="h-4 w-4" />, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }), group: 'Navigation' },
    { id: 'metrics', label: 'Zu Metriken', icon: <ChartBar className="h-4 w-4" />, action: () => onScrollTo('metrics'), group: 'Navigation' },
    { id: 'charts', label: 'Zu Charts', icon: <Calendar className="h-4 w-4" />, action: () => onScrollTo('charts'), group: 'Navigation' },
    { id: 'tables', label: 'Zu Tabellen', icon: <Table className="h-4 w-4" />, action: () => onScrollTo('tables'), group: 'Navigation' },
    { id: 'help', label: 'Hilfe & Tastenkürzel', shortcut: '?', icon: <CircleHelp className="h-4 w-4" />, action: onHelp, group: 'Hilfe' },
  ]

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
                    onSelect={() => runCommand(cmd)}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent"
                  >
                    {cmd.icon}
                    <span className="flex-1">{cmd.label}</span>
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
