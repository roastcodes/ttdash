import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
      <DialogContent
        data-testid="forecast-zoom-dialog-content"
        className="top-4 h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[96vw] max-w-[96vw] translate-y-0 gap-0 overflow-hidden p-0 sm:top-6 sm:h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-3rem)] sm:w-[95vw] sm:max-w-[95vw]"
      >
        <div data-testid="forecast-zoom-dialog-shell" className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 gap-1 border-b border-border/50 px-4 py-4 pr-12 text-left sm:px-6">
            <DialogTitle>{t('forecast.zoomDialogTitle')}</DialogTitle>
            <DialogDescription>{t('forecast.zoomDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div
            data-testid="forecast-zoom-dialog-body"
            className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
          >
            <div className="space-y-6">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
