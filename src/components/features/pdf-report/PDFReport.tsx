import { useState } from 'react'
import { localMonth } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { FileText, LoaderCircle } from 'lucide-react'

/**
 * Convert any modern CSS color (oklab, oklch, etc.) to an rgb() string
 * by drawing it onto a canvas and reading back the pixel.
 */
function toRgb(color: string): string {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return color
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  return a < 255 ? `rgba(${r},${g},${b},${(a / 255).toFixed(3)})` : `rgb(${r},${g},${b})`
}

/** Check if a CSS value contains modern color functions unsupported by html2canvas */
function hasModernColor(val: string): boolean {
  return val.includes('oklab') || val.includes('oklch') || val.includes('color-mix')
}

interface PDFReportProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function PDFReportButton({ containerRef }: PDFReportProps) {
  const [generating, setGenerating] = useState(false)
  const { addToast } = useToast()

  const handleGenerate = async () => {
    if (!containerRef.current || generating) return
    setGenerating(true)

    const inlineBackups = new Map<Element, string>()
    const styleBackups: { el: HTMLStyleElement; text: string }[] = []

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const container = containerRef.current
      const isDark = document.documentElement.classList.contains('dark')
      const bgColor = isDark ? '#0f1117' : '#f3f4f6'

      // STEP 1: Force ALL color properties as inline rgb values.
      // getComputedStyle in modern browsers may return oklab() values,
      // which html2canvas cannot parse. We convert them to rgb via canvas.
      const allEls = [container, ...Array.from(container.querySelectorAll('*'))]
      const colorProps = [
        'color', 'background-color', 'border-color',
        'border-top-color', 'border-right-color',
        'border-bottom-color', 'border-left-color',
        'outline-color', 'text-decoration-color',
        'caret-color', 'column-rule-color',
      ]

      for (const el of allEls) {
        const htmlEl = el as HTMLElement
        inlineBackups.set(el, htmlEl.style.cssText)
        const cs = getComputedStyle(htmlEl)
        for (const prop of colorProps) {
          const val = cs.getPropertyValue(prop)
          if (val && val !== 'transparent' && val !== '' && val !== 'none') {
            htmlEl.style.setProperty(prop, hasModernColor(val) ? toRgb(val) : val)
          }
        }
        htmlEl.style.setProperty('backdrop-filter', 'none')
        htmlEl.style.setProperty('-webkit-backdrop-filter', 'none')
      }

      // STEP 2: Also patch <style> textContent to remove oklab/oklch from CSS rules.
      // This prevents html2canvas from encountering them during stylesheet parsing.
      document.querySelectorAll('style').forEach(style => {
        const text = style.textContent
        if (text && (text.includes('oklab') || text.includes('oklch'))) {
          styleBackups.push({ el: style, text })
          style.textContent = text
            .split('oklab').join('srgb')
            .split('oklch').join('srgb')
        }
      })

      await new Promise(r => setTimeout(r, 200))

      const canvas = await html2canvas(container, {
        backgroundColor: bgColor,
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        foreignObjectRendering: false,
      })

      // STEP 3: Restore everything
      for (const { el, text } of styleBackups) {
        el.textContent = text
      }
      for (const el of allEls) {
        (el as HTMLElement).style.cssText = inlineBackups.get(el) ?? ''
      }

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210
      const pageHeight = 297
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

      const month = localMonth()
      pdf.save(`ttdash-report-${month}.pdf`)
      addToast('PDF Report exportiert', 'success')
    } catch (error) {
      console.error('PDF generation failed:', error)
      // Restore stylesheets
      for (const { el, text } of styleBackups) {
        el.textContent = text
      }
      // Restore inline styles
      if (containerRef.current) {
        const allEls = [containerRef.current, ...Array.from(containerRef.current.querySelectorAll('*'))]
        for (const el of allEls) {
          const saved = inlineBackups.get(el)
          ;(el as HTMLElement).style.cssText = saved !== undefined ? saved : ''
        }
      }
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
