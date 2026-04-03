import { Upload, Trash2, Download, Moon, Sun, CircleHelp, Zap, Flame, FileUp, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VERSION } from '@/lib/constants'
import { HelpPanel } from '@/components/features/help/HelpPanel'

interface DataSource {
  type: 'stored' | 'auto-import' | 'file'
  label?: string
  time?: string
}

interface HeaderProps {
  dateRange: { start: string; end: string } | null
  isDark: boolean
  helpOpen: boolean
  streak?: number
  dataSource?: DataSource | null
  onHelpOpenChange: (open: boolean) => void
  onToggleTheme: () => void
  onExportCSV: () => void
  onDelete: () => void
  onUpload: () => void
  onAutoImport: () => void
  limitsButton?: React.ReactNode
  pdfButton?: React.ReactNode
}

function DataSourceBadge({ source }: { source: DataSource }) {
  if (source.type === 'auto-import') {
    return (
      <span className="text-[10px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20" title="Daten via Auto-Import geladen">
        <Zap className="h-2.5 w-2.5" />
        Auto-Import
        {source.time && <span className="text-green-400/60">· {source.time}</span>}
      </span>
    )
  }
  if (source.type === 'file') {
    return (
      <span className="text-[10px] font-medium inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20" title={`Geladen aus ${source.label ?? 'Datei'}`}>
        <FileUp className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate max-w-28 sm:max-w-40">{source.label ?? 'Datei'}</span>
        {source.time && <span className="text-blue-400/60 shrink-0">· {source.time}</span>}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground border border-border/50" title="Gespeicherte Daten vom letzten Import">
      <HardDrive className="h-2.5 w-2.5" />
      Gespeichert
    </span>
  )
}

export function Header({ dateRange, isDark, helpOpen, streak, dataSource, onHelpOpenChange, onToggleTheme, onExportCSV, onDelete, onUpload, onAutoImport, limitsButton, pdfButton }: HeaderProps) {
  return (
    <header className="py-4 px-1 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight shrink-0">
                <span className="text-primary">TT</span>Dash
              </h1>
              <span className="text-xs text-muted-foreground font-mono shrink-0">v{VERSION}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 md:hidden">
              <Button variant="ghost" size="icon" onClick={() => onHelpOpenChange(true)} title="Hilfe & Tastenkürzel">
                <CircleHelp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onToggleTheme} title="Theme wechseln">
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dateRange && (
              <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 rounded-md bg-muted/50 border border-border/50">
                {dateRange.start} — {dateRange.end}
              </span>
            )}
            {dataSource && <DataSourceBadge source={dataSource} />}
            {streak != null && streak > 1 && (
              <span className="text-xs font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                <Flame className="h-3 w-3" />
                {streak}T Streak
              </span>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onHelpOpenChange(true)} title="Hilfe & Tastenkürzel">
            <CircleHelp className="h-4 w-4" />
          </Button>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 font-mono px-1.5 py-0.5 rounded border border-border/30 bg-muted/20">⌘K</kbd>
          <Button variant="ghost" size="icon" onClick={onToggleTheme} title="Theme wechseln">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <Button variant="outline" size="sm" onClick={onAutoImport} title="Auto-Import" className="h-11 flex-col gap-1 px-0 text-[10px] sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
          <Zap className="h-4 w-4" />
          <span>Import</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onUpload} title="Daten hochladen" className="h-11 flex-col gap-1 px-0 text-[10px] sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
          <Upload className="h-4 w-4" />
          <span>Upload</span>
        </Button>
        <div className="contents sm:block sm:w-px sm:h-5 sm:bg-border/50" />
        <div className="contents sm:block">
          {limitsButton}
        </div>
        <div className="contents sm:block">
          {pdfButton}
        </div>
        <Button variant="outline" size="sm" onClick={onExportCSV} title="CSV Export" className="h-11 flex-col gap-1 px-0 text-[10px] sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
          <Download className="h-4 w-4" />
          <span>CSV</span>
        </Button>
        <div className="contents sm:block sm:w-px sm:h-5 sm:bg-border/50" />
        <Button variant="ghost" size="sm" onClick={onDelete} title="Daten löschen" className="h-11 flex-col gap-1 px-0 text-[10px] sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
          <span className="sm:sr-only">Löschen</span>
        </Button>
      </div>

      <HelpPanel open={helpOpen} onOpenChange={onHelpOpenChange} />
    </header>
  )
}
