import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { generatePdfReport } from '@/lib/api'
import { FileText, LoaderCircle } from 'lucide-react'
import type { ViewMode } from '@/types'

interface PDFReportProps {
  viewMode: ViewMode
  selectedMonth: string | null
  selectedProviders: string[]
  selectedModels: string[]
  startDate?: string
  endDate?: string
}

export function PDFReportButton({ viewMode, selectedMonth, selectedProviders, selectedModels, startDate, endDate }: PDFReportProps) {
  const [generating, setGenerating] = useState(false)
  const { addToast } = useToast()

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)

    try {
      const blob = await generatePdfReport({
        viewMode,
        selectedMonth,
        selectedProviders,
        selectedModels,
        startDate,
        endDate,
      })
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `ttdash-report-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      addToast('PDF Report exportiert', 'success')
    } catch (error) {
      console.error('PDF generation failed:', error)
      addToast(`PDF-Export fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={generating}
      title="PDF Report"
      className="h-11 flex-col gap-1 px-0 text-[10px] sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
    >
      {generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      <span>Report</span>
    </Button>
  )
}
