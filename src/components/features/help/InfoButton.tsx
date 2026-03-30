import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/cn'

interface InfoButtonProps {
  text: string
  className?: string
}

export function InfoButton({ text, className }: InfoButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className={cn('inline-flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors', className)}>
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
