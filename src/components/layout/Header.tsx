import { Upload, Trash2, Download, Moon, Sun, CircleHelp, Zap, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VERSION } from '@/lib/constants'
import { HelpPanel } from '@/components/features/help/HelpPanel'

interface HeaderProps {
  dateRange: { start: string; end: string } | null
  isDark: boolean
  helpOpen: boolean
  streak?: number
  onHelpOpenChange: (open: boolean) => void
  onToggleTheme: () => void
  onExportCSV: () => void
  onDelete: () => void
  onUpload: () => void
  onAutoImport: () => void
  pdfButton?: React.ReactNode
}

export function Header({ dateRange, isDark, helpOpen, streak, onHelpOpenChange, onToggleTheme, onExportCSV, onDelete, onUpload, onAutoImport, pdfButton }: HeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 px-1">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-primary">CC</span>Usage
        </h1>
        <span className="text-xs text-muted-foreground font-mono">v{VERSION}</span>
        {dateRange && (
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline px-2 py-0.5 rounded-md bg-muted/50 border border-border/50">
            {dateRange.start} — {dateRange.end}
          </span>
        )}
        {streak != null && streak > 1 && (
          <span className="text-xs font-medium hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Flame className="h-3 w-3" />{streak}T Streak
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAutoImport} title="Auto-Import">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Auto-Import</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onUpload} title="Daten hochladen">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
        <div className="w-px h-5 bg-border/50 hidden sm:block" />
        {pdfButton}
        <Button variant="outline" size="sm" onClick={onExportCSV} title="CSV Export">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
        <div className="w-px h-5 bg-border/50 hidden sm:block" />
        <Button variant="ghost" size="sm" onClick={onDelete} title="Daten löschen" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onHelpOpenChange(true)} title="Hilfe & Tastenkürzel">
          <CircleHelp className="h-4 w-4" />
        </Button>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 font-mono px-1.5 py-0.5 rounded border border-border/30 bg-muted/20">⌘K</kbd>
        <Button variant="ghost" size="icon" onClick={onToggleTheme} title="Theme wechseln">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      <HelpPanel open={helpOpen} onOpenChange={onHelpOpenChange} />
    </header>
  )
}
