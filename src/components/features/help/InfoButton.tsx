import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { cn } from '@/lib/cn'

interface InfoButtonProps {
  text: string
  className?: string
}

export function InfoButton({ text, className }: InfoButtonProps) {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={t('common.showInfo')}
          data-info-button="true"
          className={cn('inline-flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors', className)}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
