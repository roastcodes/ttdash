import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency, formatCurrencyExact, formatTokens, formatTokensExact, formatNumber, formatPercent } from '@/lib/formatters'
import { cn } from '@/lib/cn'

type ValueType = 'currency' | 'tokens' | 'number' | 'percent'

interface FormattedValueProps {
  value: number
  type: ValueType
  className?: string
  decimals?: number  // for percent type
  label?: string
  insight?: string
}

// Maps type to abbreviated formatter
const FORMATTERS: Record<ValueType, (value: number, decimals?: number) => string> = {
  currency: (v) => formatCurrency(v),
  tokens: (v) => formatTokens(v),
  number: (v) => formatNumber(v),
  percent: (v, d) => formatPercent(v, d),
}

// Maps type to exact formatter for tooltip
const EXACT_FORMATTERS: Record<ValueType, (value: number) => string> = {
  currency: (v) => formatCurrencyExact(v),
  tokens: (v) => formatTokensExact(v),
  number: (v) => formatNumber(v),
  percent: (v) => formatPercent(v, 4),
}

export function FormattedValue({ value, type, className, decimals, label, insight }: FormattedValueProps) {
  const abbreviated = FORMATTERS[type](value, decimals)
  const exact = EXACT_FORMATTERS[type](value)

  // Don't show tooltip if abbreviated === exact (no abbreviation happened)
  const isAbbreviated = abbreviated !== exact

  if (!isAbbreviated) {
    return <span className={className}>{abbreviated}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('cursor-help decoration-dotted underline underline-offset-4 decoration-muted-foreground/40', className)}>
          {abbreviated}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px]">
        <div className="space-y-1">
          {label && <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>}
          <div className="font-mono text-xs">{exact}</div>
          {insight && <div className="text-[11px] text-muted-foreground leading-relaxed">{insight}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
