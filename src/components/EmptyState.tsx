import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { VERSION } from '@/lib/constants'

interface EmptyStateProps {
  onUpload: () => void
}

export function EmptyState({ onUpload }: EmptyStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-bold">
          <span className="text-primary">CC</span>Usage
        </h1>
        <p className="text-xs text-muted-foreground font-mono">v{VERSION}</p>
        <p className="text-muted-foreground text-sm">
          Lade eine <code className="font-mono text-primary">ccusage.json</code> Datei hoch, um deine Claude Code Nutzung zu analysieren.
        </p>
        <Button onClick={onUpload} size="lg" className="gap-2">
          <Upload className="h-4 w-4" />
          Datei hochladen
        </Button>
      </Card>
    </div>
  )
}
