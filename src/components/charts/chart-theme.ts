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

export const CHART_MARGIN = { top: 5, right: 10, left: 10, bottom: 5 }

export const CHART_ANIMATION = {
  duration: 800,
  easing: 'ease-out' as const,
  stagger: 140,
  slowDuration: 1200,
}

/** Generate a CSS-safe gradient ID from a name */
export function gradientId(name: string): string {
  return `grad-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`
}
