import type { DashboardSectionId } from '@/types'

/** Reserved placeholder heights used while dashboard sections lazy-render on scroll. */
export const dashboardSectionPlaceholderClassName: Record<DashboardSectionId, string> = {
  insights: 'min-h-[260px]',
  metrics: 'min-h-[320px]',
  today: 'min-h-[320px]',
  currentMonth: 'min-h-[360px]',
  activity: 'min-h-[360px]',
  forecastCache: 'min-h-[900px]',
  limits: 'min-h-[480px]',
  costAnalysis: 'min-h-[1460px]',
  tokenAnalysis: 'min-h-[430px]',
  requestAnalysis: 'min-h-[1040px]',
  advancedAnalysis: 'min-h-[760px]',
  comparisons: 'min-h-[480px]',
  tables: 'min-h-[1100px]',
}

/** DOM anchor aliases that preserve existing dashboard deep links. */
export const dashboardSectionAnchorMap: Partial<Record<DashboardSectionId, string>> = {
  costAnalysis: 'charts',
  currentMonth: 'current-month',
  forecastCache: 'forecast-cache',
  tokenAnalysis: 'token-analysis',
  requestAnalysis: 'request-analysis',
  advancedAnalysis: 'advanced-analysis',
}
