import { Upload, ChartBar, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { VERSION } from '@/lib/constants'

interface EmptyStateProps {
  onUpload: () => void
  onAutoImport: () => void
}

export function EmptyState({ onUpload, onAutoImport }: EmptyStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="p-10 max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ChartBar className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">CC</span>Usage
          </h1>
          <p className="text-xs text-muted-foreground font-mono">v{VERSION}</p>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Lade eine <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">ccusage.json</code> Datei hoch, um deine Claude Code Nutzung zu analysieren.
        </p>
        <Button onClick={onAutoImport} size="lg" className="gap-2 w-full">
          <Zap className="h-4 w-4" />
          Auto-Import
        </Button>
        <p className="text-muted-foreground text-xs">oder</p>
        <Button onClick={onUpload} variant="outline" size="lg" className="gap-2 w-full">
          <Upload className="h-4 w-4" />
          Datei hochladen
        </Button>
      </Card>
    </div>
  )
}
