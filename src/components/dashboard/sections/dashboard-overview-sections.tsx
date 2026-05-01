import { PrimaryMetrics } from '../../cards/PrimaryMetrics'
import { SecondaryMetrics } from '../../cards/SecondaryMetrics'
import { TodayMetrics } from '../../cards/TodayMetrics'
import { MonthMetrics } from '../../cards/MonthMetrics'
import { HeatmapCalendar } from '../../features/heatmap/HeatmapCalendar'
import { UsageInsights } from '../../features/insights/UsageInsights'
import { SectionHeader } from '../../ui/section-header'
import { SECTION_HELP } from '@/lib/help-content'
import type { DashboardSectionId } from '@/types'
import type { DashboardSectionRenderer } from './dashboard-section-renderer-types'

const activityDescriptionKeys = {
  daily: 'dashboard.activity.dailyDescription',
  monthly: 'dashboard.activity.monthlyDescription',
  yearly: 'dashboard.activity.yearlyDescription',
} as const

/** Renderers for eager overview and activity dashboard sections. */
export const overviewSectionRenderers = {
  insights: ({ viewModel, renderAnimatedSection }) => {
    const { overview, layout } = viewModel

    return layout.sectionVisibility.insights
      ? renderAnimatedSection(
          'insights',
          <UsageInsights
            metrics={overview.metrics}
            viewMode={overview.viewMode}
            totalCalendarDays={overview.totalCalendarDays}
          />,
          { eager: true },
        )
      : null
  },
  metrics: ({ viewModel, t, renderAnimatedSection }) => {
    const { overview, layout } = viewModel

    return layout.sectionVisibility.metrics
      ? renderAnimatedSection(
          'metrics',
          <>
            <SectionHeader
              title={t('dashboard.metrics.title')}
              badge={t('dashboard.metrics.badge')}
              description={t('dashboard.metrics.description')}
              info={SECTION_HELP.metrics}
            />
            <PrimaryMetrics
              metrics={overview.metrics}
              totalCalendarDays={overview.totalCalendarDays}
              viewMode={overview.viewMode}
            />
            <div className="mt-4">
              <SecondaryMetrics
                metrics={overview.metrics}
                dailyCosts={overview.dailyCosts}
                viewMode={overview.viewMode}
              />
            </div>
          </>,
          { eager: true },
        )
      : null
  },
  today: ({ viewModel, renderAnimatedSection }) => {
    const { overview, layout } = viewModel

    return layout.sectionVisibility.today && overview.todayData
      ? renderAnimatedSection(
          'today',
          <TodayMetrics today={overview.todayData} metrics={overview.metrics} />,
          {
            eager: true,
          },
        )
      : null
  },
  currentMonth: ({ viewModel, renderAnimatedSection }) => {
    const { overview, layout } = viewModel

    return layout.sectionVisibility.currentMonth && overview.hasCurrentMonthData
      ? renderAnimatedSection(
          'currentMonth',
          <MonthMetrics daily={overview.filteredDailyData} metrics={overview.metrics} />,
          {
            eager: true,
          },
        )
      : null
  },
  activity: ({ viewModel, t, renderAnimatedSection }) => {
    const { overview, layout } = viewModel

    return layout.sectionVisibility.activity
      ? renderAnimatedSection(
          'activity',
          <>
            <SectionHeader
              title={t('dashboard.activity.title')}
              description={t(activityDescriptionKeys[overview.viewMode])}
              info={SECTION_HELP.activity}
            />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <HeatmapCalendar
                data={overview.filteredData}
                viewMode={overview.viewMode}
                metric="cost"
                isDark={overview.isDark}
              />
              <HeatmapCalendar
                data={overview.filteredData}
                viewMode={overview.viewMode}
                metric="requests"
                isDark={overview.isDark}
              />
              <HeatmapCalendar
                data={overview.filteredData}
                viewMode={overview.viewMode}
                metric="tokens"
                isDark={overview.isDark}
              />
            </div>
          </>,
          { eager: false },
        )
      : null
  },
} satisfies Partial<Record<DashboardSectionId, DashboardSectionRenderer>>
