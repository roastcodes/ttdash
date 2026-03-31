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
  pdfButton?: React.ReactNode
}

function DataSourceBadge({ source }: { source: DataSource }) {
  if (source.type === 'auto-import') {
    return (
      <span className="text-[10px] font-medium hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20" title="Daten via Auto-Import geladen">
        <Zap className="h-2.5 w-2.5" />Auto-Import{source.time && <span className="text-green-400/60">· {source.time}</span>}
      </span>
    )
  }
  if (source.type === 'file') {
    return (
      <span className="text-[10px] font-medium hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 max-w-48 truncate" title={`Geladen aus ${source.label ?? 'Datei'}`}>
        <FileUp className="h-2.5 w-2.5 shrink-0" />{source.label ?? 'Datei'}{source.time && <span className="text-blue-400/60 shrink-0">· {source.time}</span>}
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground border border-border/50" title="Gespeicherte Daten vom letzten Import">
      <HardDrive className="h-2.5 w-2.5" />Gespeichert
    </span>
  )
}

export function Header({ dateRange, isDark, helpOpen, streak, dataSource, onHelpOpenChange, onToggleTheme, onExportCSV, onDelete, onUpload, onAutoImport, pdfButton }: HeaderProps) {
  return (
    <header className="py-4 px-1 space-y-2">
      {/* Row 1: Brand + Meta | Utility icons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight shrink-0">
            <span className="text-primary">CC</span>Usage
          </h1>
          <span className="text-xs text-muted-foreground font-mono shrink-0">v{VERSION}</span>
          {dateRange && (
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline px-2 py-0.5 rounded-md bg-muted/50 border border-border/50 shrink-0">
              {dateRange.start} — {dateRange.end}
            </span>
          )}
          {dataSource && <DataSourceBadge source={dataSource} />}
          {streak != null && streak > 1 && (
            <span className="text-xs font-medium hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
              <Flame className="h-3 w-3" />{streak}T Streak
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onHelpOpenChange(true)} title="Hilfe & Tastenkürzel">
            <CircleHelp className="h-4 w-4" />
          </Button>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 font-mono px-1.5 py-0.5 rounded border border-border/30 bg-muted/20">⌘K</kbd>
          <Button variant="ghost" size="icon" onClick={onToggleTheme} title="Theme wechseln">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Row 2: Action buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onAutoImport} title="Auto-Import">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Auto-Import</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onUpload} title="Daten hochladen">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
        <div className="w-px h-5 bg-border/50" />
        {pdfButton}
        <Button variant="outline" size="sm" onClick={onExportCSV} title="CSV Export">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
        <div className="w-px h-5 bg-border/50" />
        <Button variant="ghost" size="sm" onClick={onDelete} title="Daten löschen" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <HelpPanel open={helpOpen} onOpenChange={onHelpOpenChange} />
    </header>
  )
}
