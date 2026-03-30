export const CHART_COLORS = {
  cost: 'hsl(215, 70%, 55%)',
  ma7: 'hsl(262, 60%, 65%)',
  cumulative: 'hsl(160, 50%, 52%)',
  input: 'hsl(340, 55%, 52%)',
  output: 'hsl(35, 80%, 52%)',
  cacheWrite: 'hsl(262, 60%, 55%)',
  cacheRead: 'hsl(160, 50%, 42%)',
  grid: 'hsl(224, 12%, 18%)',
  axis: 'hsl(220, 8%, 46%)',
  tooltipBg: 'hsl(224, 18%, 10%)',
  tooltipBorder: 'hsl(224, 12%, 18%)',
}

export const CHART_MARGIN = { top: 5, right: 10, left: 10, bottom: 5 }

export const CHART_ANIMATION = {
  duration: 800,
  easing: 'ease-out' as const,
}

/** Generate a CSS-safe gradient ID from a name */
export function gradientId(name: string): string {
  return `grad-${name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`
}
