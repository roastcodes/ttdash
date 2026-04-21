import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { CostForecast } from './CostForecast'
import { ProviderCostForecast } from './ProviderCostForecast'
import type { DashboardForecastState } from '@/lib/calculations'
import type { DailyUsage, ViewMode } from '@/types'

interface ForecastZoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: DailyUsage[]
  forecastState: DashboardForecastState
  viewMode: ViewMode
}

/** Renders the shared zoom dialog for the current-month forecast views. */
export function ForecastZoomDialog({
  open,
  onOpenChange,
  data,
  forecastState,
  viewMode,
}: ForecastZoomDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] overflow-auto p-4 sm:h-[90vh] sm:max-h-[90vh] sm:w-[95vw] sm:max-w-[95vw] sm:p-6">
        <DialogTitle>{t('forecast.zoomDialogTitle')}</DialogTitle>
        <DialogDescription>{t('forecast.zoomDialogDescription')}</DialogDescription>
        <div className="space-y-6 pt-2">
          <CostForecast
            data={data}
            forecast={forecastState.costForecast}
            viewMode={viewMode}
            expandable={false}
          />
          <ProviderCostForecast
            forecast={forecastState.providerForecast}
            viewMode={viewMode}
            expandable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
