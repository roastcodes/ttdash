import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoaderCircle, CheckCircle2, XCircle, Terminal } from 'lucide-react'
import { startAutoImport } from '@/lib/auto-import'
import type { CheckEvent, SuccessEvent } from '@/lib/auto-import'

type Status = 'idle' | 'checking' | 'running' | 'success' | 'error'
type LineType = 'check' | 'progress' | 'stderr' | 'success' | 'error'

interface Line {
  type: LineType
  text: string
}

interface AutoImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const lineColors: Record<LineType, string> = {
  check: 'text-primary',
  progress: 'text-muted-foreground',
  stderr: 'text-foreground',
  success: 'text-green-500',
  error: 'text-destructive',
}

export function AutoImportModal({ open, onOpenChange, onSuccess }: AutoImportModalProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('idle')
  const [lines, setLines] = useState<Line[]>([])
  const [summary, setSummary] = useState<SuccessEvent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<{ close: () => void } | null>(null)

  const addLine = useCallback((type: LineType, text: string) => {
    setLines(prev => [...prev, { type, text }])
  }, [])

  useEffect(() => {
    if (!open) return

    setStatus('checking')
    setLines([])
    setSummary(null)

    const handle = startAutoImport({
      onCheck: (data: CheckEvent) => {
        if (data.status === 'checking') {
          addLine('check', t('autoImportModal.checkingTool', { tool: data.tool }))
        } else if (data.status === 'found') {
          addLine('check', t('autoImportModal.toolFound', { tool: data.tool, method: data.method, version: data.version }))
          setStatus('running')
        } else if (data.status === 'not_found') {
          addLine('check', t('autoImportModal.toolNotFound', { tool: data.tool }))
        }
      },
      onProgress: (data) => {
        addLine('progress', data.message)
      },
      onStderr: (data) => {
        addLine('stderr', data.line)
      },
      onSuccess: (data: SuccessEvent) => {
        addLine('success', t('autoImportModal.importedDays', { days: data.days, cost: data.totalCost.toFixed(2) }))
        setSummary(data)
        setStatus('success')
        onSuccess()
      },
      onError: (data) => {
        addLine('error', data.message)
        setStatus('error')
      },
      onDone: () => {
        closeRef.current = null
      },
    }, t)

    closeRef.current = handle

    return () => {
      handle.close()
      closeRef.current = null
    }
  }, [open, addLine, onSuccess, t])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  const isRunning = status === 'checking' || status === 'running'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isRunning) onOpenChange(v) }}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => { if (isRunning) e.preventDefault() }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            {t('autoImportModal.title')}
          </DialogTitle>
          <DialogDescription>
            {t('autoImportModal.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Terminal output */}
        <div
          ref={scrollRef}
          className="bg-muted/30 rounded-lg p-3 font-mono text-xs max-h-[300px] min-h-[120px] overflow-y-auto border border-border"
        >
          {lines.length === 0 && (
            <span className="text-muted-foreground">{t('autoImportModal.connecting')}</span>
          )}
          {lines.map((line, i) => (
            <div key={i} className={lineColors[line.type]}>
              {line.text.split('\n').map((segment, j) => (
                <div key={j}>{segment}</div>
              ))}
            </div>
          ))}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {isRunning && (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                <span className="text-muted-foreground">
                  {status === 'checking' ? t('autoImportModal.checkingPrerequisites') : t('autoImportModal.importingData')}
                </span>
              </>
            )}
            {status === 'success' && summary && (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-green-500">
                  {t('autoImportModal.loadedDays', { days: summary.days, cost: summary.totalCost.toFixed(2) })}
                </span>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">{t('autoImportModal.errorOccurred')}</span>
              </>
            )}
          </div>

          {!isRunning && (
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('autoImportModal.close')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
