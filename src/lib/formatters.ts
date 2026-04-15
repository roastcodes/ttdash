import i18n, { getCurrentLocale } from '@/lib/i18n'

/** Formats a Date as YYYY-MM-DD in local timezone. */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns today's date as YYYY-MM-DD in local timezone. */
export function localToday(): string {
  return toLocalDateStr(new Date())
}

/** Returns the current month as YYYY-MM in local timezone. */
export function localMonth(): string {
  return localToday().slice(0, 7)
}

/** Coerces a string or number to a finite number. */
export function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

/** Formats a currency value for compact dashboard surfaces. */
export function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  if (value >= 100) return `$${Math.round(value)}`
  if (value >= 10) return `$${value.toFixed(1)}`
  return `$${value.toFixed(2)}`
}

/** Formats a currency value with fixed cents and locale grouping. */
export function formatCurrencyExact(value: number): string {
  return `$${value.toLocaleString(getCurrentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Formats a token count for compact dashboard surfaces. */
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

/** Formats a number with locale grouping. */
export function formatNumber(value: number): string {
  return value.toLocaleString(getCurrentLocale())
}

/** Formats an exact token count with the localized token label. */
export function formatTokensExact(value: number): string {
  return `${value.toLocaleString(getCurrentLocale())} ${i18n.t('common.tokens')}`
}

/** Formats a percentage with a fixed number of decimals. */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/** Formats a daily, monthly, or yearly period label for display. */
export function formatDate(dateStr: string, mode: 'short' | 'long' | 'weekday' = 'short'): string {
  // Yearly period: "2026"
  if (/^\d{4}$/.test(dateStr)) return dateStr

  // Monthly period: "2026-03"
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y = '0', m = '1'] = dateStr.split('-')
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1)
    if (mode === 'short')
      return d.toLocaleDateString(getCurrentLocale(), { month: 'short', year: '2-digit' })
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

/** Formats a period label for compact chart axes. */
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

/** Returns the localized period noun for the given view mode. */
export function periodLabel(viewMode: 'daily' | 'monthly' | 'yearly', plural = false): string {
  if (viewMode === 'monthly') return i18n.t(plural ? 'periods.months' : 'periods.month')
  if (viewMode === 'yearly') return i18n.t(plural ? 'periods.years' : 'periods.year')
  return i18n.t(plural ? 'periods.days' : 'periods.day')
}

/** Returns the localized singular period unit for compound labels. */
export function periodUnit(viewMode: 'daily' | 'monthly' | 'yearly'): string {
  if (viewMode === 'monthly') return i18n.t('periods.unitMonth')
  if (viewMode === 'yearly') return i18n.t('periods.unitYear')
  return i18n.t('periods.unitDay')
}

/** Formats a YYYY-MM period label for display. */
export function formatMonthYear(dateStr: string): string {
  if (!/^\d{4}-\d{2}$/.test(dateStr)) return ''

  const [year = '', month = ''] = dateStr.split('-')
  const parsedYear = Number.parseInt(year, 10)
  const parsedMonth = Number.parseInt(month, 10)

  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth)) return ''
  if (parsedMonth < 1 || parsedMonth > 12) return ''

  const date = new Date(parsedYear, parsedMonth - 1)
  return date.toLocaleDateString(getCurrentLocale(), { month: 'long', year: 'numeric' })
}

/** Formats a timestamp for compact metadata surfaces. */
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

/** Formats a timestamp with the full local date and time. */
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
