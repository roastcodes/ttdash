import { Upload, Trash2, Download, Moon, Sun, CircleHelp, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VERSION } from '@/lib/constants'
import { HelpPanel } from '@/components/features/help/HelpPanel'

interface HeaderProps {
  dateRange: { start: string; end: string } | null
  isDark: boolean
  helpOpen: boolean
  onHelpOpenChange: (open: boolean) => void
  onToggleTheme: () => void
  onExportCSV: () => void
  onDelete: () => void
  onUpload: () => void
  onAutoImport: () => void
  pdfButton?: React.ReactNode
}

export function Header({ dateRange, isDark, helpOpen, onHelpOpenChange, onToggleTheme, onExportCSV, onDelete, onUpload, onAutoImport, pdfButton }: HeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4 px-1">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-primary">CC</span>Usage
        </h1>
        <span className="text-xs text-muted-foreground font-mono">v{VERSION}</span>
        {dateRange && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {dateRange.start} — {dateRange.end}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {pdfButton}
        <Button variant="outline" size="sm" onClick={onExportCSV} title="CSV Export">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} title="Daten löschen">
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Löschen</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onAutoImport} title="Auto-Import">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Auto-Import</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onUpload} title="Daten hochladen">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onHelpOpenChange(true)} title="Hilfe & Tastenkürzel">
          <CircleHelp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleTheme} title="Theme wechseln">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      <HelpPanel open={helpOpen} onOpenChange={onHelpOpenChange} />
    </header>
  )
}
