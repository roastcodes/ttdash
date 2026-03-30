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

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(dateStr: string, mode: 'short' | 'long' | 'weekday' = 'short'): string {
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
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
}

export function formatMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
}
