import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

interface PDFReportProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function PDFReportButton({ containerRef }: PDFReportProps) {
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!containerRef.current || generating) return
    setGenerating(true)

    try {
      const container = containerRef.current
      const canvas = await html2canvas(container, {
        backgroundColor: '#0f1117',
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF('p', 'mm', 'a4')
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const month = new Date().toISOString().slice(0, 7)
      pdf.save(`ccusage-report-${month}.pdf`)
    } catch (error) {
      console.error('PDF generation failed:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} title="PDF Report">
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      <span className="hidden sm:inline">Report</span>
    </Button>
  )
}
