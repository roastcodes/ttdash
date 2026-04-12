import i18n, { getCurrentLocale } from '@/lib/i18n'

/** Formats a Date as YYYY-MM-DD in local timezone */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns today's date as YYYY-MM-DD in local timezone */
export function localToday(): string {
  return toLocalDateStr(new Date())
}

/** Returns current month as YYYY-MM in local timezone */
export function localMonth(): string {
  return localToday().slice(0, 7)
}

export function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  if (value >= 100) return `$${Math.round(value)}`
  if (value >= 10) return `$${value.toFixed(1)}`
  return `$${value.toFixed(2)}`
}

export function formatCurrencyExact(value: number): string {
  return `$${value.toLocaleString(getCurrentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatTokens(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`
  if (value >= 100) return value.toFixed(0)
  if (value >= 10) return value.toFixed(1)
  if (value >= 1) return value.toFixed(2)
  if (value === 0) return '0'
  return value.toFixed(3)
}

export function formatNumber(value: number): string {
  return value.toLocaleString(getCurrentLocale())
}

export function formatTokensExact(value: number): string {
  return `${value.toLocaleString(getCurrentLocale())} ${i18n.t('common.tokens')}`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(dateStr: string, mode: 'short' | 'long' | 'weekday' = 'short'): string {
  // Yearly period: "2026"
  if (/^\d{4}$/.test(dateStr)) return dateStr

  // Monthly period: "2026-03"
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y = '0', m = '1'] = dateStr.split('-')
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1)
    if (mode === 'short') return d.toLocaleDateString(getCurrentLocale(), { month: 'short', year: '2-digit' })
    return d.toLocaleDateString(getCurrentLocale(), { month: 'long', year: 'numeric' })
  }

  // Daily: "2026-03-31"
  const date = new Date(dateStr + 'T00:00:00')
  if (mode === 'long') {
    return date.toLocaleDateString(getCurrentLocale(), {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }
  if (mode === 'weekday') {
    return date.toLocaleDateString(getCurrentLocale(), { weekday: 'short' })
  }
  return date.toLocaleDateString(getCurrentLocale(), { day: '2-digit', month: '2-digit' })
}

export function formatDateAxis(dateStr: string): string {
  // Yearly period
  if (/^\d{4}$/.test(dateStr)) return dateStr

  // Monthly period: "2026-03"
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y = '0', m = '1'] = dateStr.split('-')
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1)
    return d.toLocaleDateString(getCurrentLocale(), { month: 'short', year: '2-digit' })
  }

  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString(getCurrentLocale(), { day: '2-digit', month: '2-digit' })
}

/** Returns the period noun for the given view mode */
export function periodLabel(viewMode: 'daily' | 'monthly' | 'yearly', plural = false): string {
  if (viewMode === 'monthly') return i18n.t(plural ? 'periods.months' : 'periods.month')
  if (viewMode === 'yearly') return i18n.t(plural ? 'periods.years' : 'periods.year')
  return i18n.t(plural ? 'periods.days' : 'periods.day')
}

/** Returns the period noun for the given view mode (singular, for compound words like "Ø/Tag") */
export function periodUnit(viewMode: 'daily' | 'monthly' | 'yearly'): string {
  if (viewMode === 'monthly') return i18n.t('periods.unitMonth')
  if (viewMode === 'yearly') return i18n.t('periods.unitYear')
  return i18n.t('periods.unitDay')
}

export function formatMonthYear(dateStr: string): string {
  const [year = '0', month = '1'] = dateStr.split('-')
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1)
  return date.toLocaleDateString(getCurrentLocale(), { month: 'long', year: 'numeric' })
}

export function formatDateTimeCompact(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(getCurrentLocale(), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTimeFull(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(getCurrentLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
