import { Button } from '@/components/ui/button'
import { FileText, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PDFReportProps {
  generating: boolean
  onGenerate: () => void
}

export function PDFReportButton({ generating, onGenerate }: PDFReportProps) {
  const { t } = useTranslation()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onGenerate}
      disabled={generating}
      title={t('commandPalette.commands.generateReport.label')}
      className="h-11 flex-col gap-1 px-0 text-[10px] sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
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
