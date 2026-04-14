import { Button } from '@/components/ui/button'
import { FileText, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PDFReportProps {
  generating: boolean
  onGenerate: () => void
}

/** Renders the PDF report generation action. */
export function PDFReportButton({ generating, onGenerate }: PDFReportProps) {
  const { t } = useTranslation()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onGenerate}
      disabled={generating}
      title={t('commandPalette.commands.generateReport.label')}
      className="h-11 justify-start gap-2 px-3 text-xs sm:h-9 sm:text-sm"
    >
      {generating ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      <span>{t('header.report')}</span>
    </Button>
  )
}
