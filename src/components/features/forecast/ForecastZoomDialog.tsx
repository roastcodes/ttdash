import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/dialog'
import { ZoomDialogContent } from '@/components/ui/zoom-dialog-content'
import { ChartExpandedSurface } from '@/components/charts/ChartCard'
import { CostForecast } from './CostForecast'
import { ProviderCostForecast } from './ProviderCostForecast'
import type { DailyUsage, DashboardForecastState, ViewMode } from '@/types'

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
      <ZoomDialogContent
        title={t('forecast.zoomDialogTitle')}
        description={t('forecast.zoomDialogDescription')}
        testId="forecast-zoom-dialog-content"
      >
        <div data-testid="forecast-zoom-dialog-shell" className="flex min-h-0 flex-col">
          <div data-testid="forecast-zoom-dialog-body" className="min-h-0 flex-1">
            <ChartExpandedSurface>
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
            </ChartExpandedSurface>
          </div>
        </div>
      </ZoomDialogContent>
    </Dialog>
  )
}
