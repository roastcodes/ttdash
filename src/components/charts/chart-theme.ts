/** Defines shared chart colors derived from the active theme tokens. */
export const CHART_COLORS = {
  cost: 'hsl(var(--chart-1))',
  ma7: 'hsl(var(--chart-2))',
  cumulative: 'hsl(var(--chart-3))',
  input: 'hsl(var(--chart-5))',
  output: 'hsl(var(--chart-4))',
  cacheWrite: 'hsl(var(--chart-2))',
  cacheRead: 'hsl(var(--chart-3))',
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
  tooltipBg: 'hsl(var(--popover))',
  tooltipBorder: 'hsl(var(--border))',
}

/** Defines the default chart margins used across the dashboard. */
export const CHART_MARGIN = { top: 5, right: 10, left: 10, bottom: 5 }

/** Defines the shared chart animation timings. */
export const CHART_ANIMATION = {
  duration: 1290,
  easing: 'ease-out' as const,
  stagger: 120,
  slowDuration: 1560,
  chartStartDelay: 285,
  barDuration: 930,
  radialDuration: 1230,
  revealDuration: 780,
}

/** Shared opacity stops for filled line/area gradients. */
export const CHART_AREA_GRADIENT = {
  topOpacity: 0.34,
  middleOpacity: 0.1,
  bottomOpacity: 0,
}

type SeriesRole = 'primary' | 'secondary' | 'stacked'

/** Builds the shared animation props for line-like series. */
export function getLineAnimationProps(
  active: boolean,
  {
    order = 0,
    role = 'primary',
  }: {
    order?: number
    role?: SeriesRole
  } = {},
) {
  const delayOffset =
    role === 'secondary' ? 140 + order * CHART_ANIMATION.stagger : order * CHART_ANIMATION.stagger

  return {
    isAnimationActive: active,
    animationBegin: CHART_ANIMATION.chartStartDelay + delayOffset,
    animationDuration:
      role === 'secondary' ? CHART_ANIMATION.slowDuration : CHART_ANIMATION.duration,
    animationEasing: CHART_ANIMATION.easing,
  }
}

/** Builds the shared animation props for area-like series. */
export function getAreaAnimationProps(
  active: boolean,
  {
    order = 0,
    role = 'primary',
  }: {
    order?: number
    role?: SeriesRole
  } = {},
) {
  return {
    ...getLineAnimationProps(active, { order, role }),
  }
}

/** Builds the shared animation props for bar-like series. */
export function getBarAnimationProps(active: boolean, order = 0) {
  return {
    isAnimationActive: active,
    animationBegin: CHART_ANIMATION.chartStartDelay + order * 90,
    animationDuration: CHART_ANIMATION.barDuration,
    animationEasing: CHART_ANIMATION.easing,
  }
}

/** Builds the shared animation props for donut/pie/radial series. */
export function getRadialAnimationProps(active: boolean, order = 0) {
  return {
    isAnimationActive: active,
    animationBegin: CHART_ANIMATION.chartStartDelay + 20 + order * 80,
    animationDuration: CHART_ANIMATION.radialDuration,
    animationEasing: CHART_ANIMATION.easing,
  }
}

/** Builds the shared animation props for scatter-like series. */
export function getScatterAnimationProps(active: boolean, delayOffsetMs = 0) {
  return {
    isAnimationActive: active,
    animationBegin: CHART_ANIMATION.chartStartDelay + delayOffsetMs,
    animationDuration: CHART_ANIMATION.revealDuration,
    animationEasing: CHART_ANIMATION.easing,
  }
}

/** Generates a CSS-safe gradient id from an arbitrary name. */
export function gradientId(name: string): string {
  return `grad-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`
}

/** Generates a CSS-safe scoped gradient id for a chart series. */
export function scopedGradientId(scope: string, series: string): string {
  return gradientId(`${scope}-${series}`)
}
