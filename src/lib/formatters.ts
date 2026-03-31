export function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  if (value >= 100) return `$${Math.round(value)}`
  if (value >= 10) return `$${value.toFixed(1)}`
  return `$${value.toFixed(2)}`
}

export function formatCurrencyExact(value: number): string {
  return `$${value.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatTokens(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`
  return value.toString()
}

export function formatNumber(value: number): string {
  return value.toLocaleString('de-CH')
}

export function formatTokensExact(value: number): string {
  return `${value.toLocaleString('de-CH')} Tokens`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(dateStr: string, mode: 'short' | 'long' | 'weekday' = 'short'): string {
  // Yearly period: "2026"
  if (/^\d{4}$/.test(dateStr)) return dateStr

  // Monthly period: "2026-03"
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split('-')
    const d = new Date(parseInt(y), parseInt(m) - 1)
    if (mode === 'short') return d.toLocaleDateString('de-CH', { month: 'short', year: '2-digit' })
    return d.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
  }

  // Daily: "2026-03-31"
  const date = new Date(dateStr + 'T00:00:00')
  if (mode === 'long') {
    return date.toLocaleDateString('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  if (mode === 'weekday') {
    return date.toLocaleDateString('de-CH', { weekday: 'short' })
  }
  return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
}

export function formatDateAxis(dateStr: string): string {
  // Yearly period
  if (/^\d{4}$/.test(dateStr)) return dateStr

  // Monthly period: "2026-03"
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split('-')
    const d = new Date(parseInt(y), parseInt(m) - 1)
    return d.toLocaleDateString('de-CH', { month: 'short', year: '2-digit' })
  }

  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
}

/** Returns the period noun for the given view mode */
export function periodLabel(viewMode: 'daily' | 'monthly' | 'yearly', plural = false): string {
  if (viewMode === 'monthly') return plural ? 'Monate' : 'Monat'
  if (viewMode === 'yearly') return plural ? 'Jahre' : 'Jahr'
  return plural ? 'Tage' : 'Tag'
}

/** Returns the period noun for the given view mode (singular, for compound words like "Ø/Tag") */
export function periodUnit(viewMode: 'daily' | 'monthly' | 'yearly'): string {
  if (viewMode === 'monthly') return 'Mt.'
  if (viewMode === 'yearly') return 'Jahr'
  return 'Tag'
}

export function formatMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
}
