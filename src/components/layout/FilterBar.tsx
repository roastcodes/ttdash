import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { cn } from '@/lib/cn'
import {
  getModelColor,
  getModelColorAlpha,
  getProviderBadgeClasses,
  getProviderBadgeStyle,
} from '@/lib/model-utils'
import { formatDate, formatMonthYear, localToday, toLocalDateStr } from '@/lib/formatters'
import { getCurrentLocale } from '@/lib/i18n'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { DashboardDatePreset, ViewMode } from '@/types'

interface FilterBarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  selectedMonth: string | null
  onMonthChange: (month: string | null) => void
  availableMonths: string[]
  availableProviders: string[]
  selectedProviders: string[]
  onToggleProvider: (provider: string) => void
  onClearProviders: () => void
  allModels: string[]
  selectedModels: string[]
  onToggleModel: (model: string) => void
  onClearModels: () => void
  startDate?: string
  endDate?: string
  onStartDateChange: (date: string | undefined) => void
  onEndDateChange: (date: string | undefined) => void
  onApplyPreset: (preset: string) => void
  onResetAll: () => void
}

function parseLocalDate(value?: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function buildCalendarDays(displayMonth: Date) {
  const year = displayMonth.getFullYear()
  const month = displayMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const cells: Array<Date | null> = []

  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day))

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function resolveActivePreset(
  selectedMonth: string | null,
  startDate?: string,
  endDate?: string,
): DashboardDatePreset | null {
  if (selectedMonth) return null
  if (!startDate && !endDate) return 'all'
  if (!startDate || !endDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fmt = toLocalDateStr

  const matchesPreset = (preset: DashboardDatePreset) => {
    switch (preset) {
      case '7d': {
        const start = new Date(today)
        start.setDate(today.getDate() - 6)
        return startDate === fmt(start) && endDate === fmt(today)
      }
      case '30d': {
        const start = new Date(today)
        start.setDate(today.getDate() - 29)
        return startDate === fmt(start) && endDate === fmt(today)
      }
      case 'month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        return startDate === fmt(start) && endDate === fmt(today)
      }
      case 'year': {
        const start = new Date(today.getFullYear(), 0, 1)
        return startDate === fmt(start) && endDate === fmt(today)
      }
      case 'all':
      default:
        return false
    }
  }

  for (const preset of ['7d', '30d', 'month', 'year'] as DashboardDatePreset[]) {
    if (matchesPreset(preset)) {
      return preset
    }
  }

  return null
}

interface DatePickerFieldProps {
  label: string
  value?: string
  onChange: (date: string | undefined) => void
}

function DatePickerField({ label, value, onChange }: DatePickerFieldProps) {
  const { t } = useTranslation()
  const dialogId = useId()
  const dialogLabelId = useId()
  const dialogDescriptionId = useId()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [overlayStyle, setOverlayStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 292,
  })
  const selectedDate = useMemo(() => parseLocalDate(value), [value])
  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => selectedDate ?? parseLocalDate(localToday()) ?? new Date(),
  )

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(getCurrentLocale(), { weekday: 'short' })
          .format(new Date(Date.UTC(2024, 0, 1 + index)))
          .replace('.', '')
          .slice(0, 2),
      ),
    [],
  )

  const monthLabel = useMemo(
    () => displayMonth.toLocaleDateString(getCurrentLocale(), { month: 'long', year: 'numeric' }),
    [displayMonth],
  )

  const calendarDays = useMemo(() => buildCalendarDays(displayMonth), [displayMonth])
  const selectableDates = useMemo(
    () => calendarDays.filter((day): day is Date => day !== null).map((day) => toLocalDateStr(day)),
    [calendarDays],
  )
  const today = localToday()
  const [focusedDate, setFocusedDate] = useState<string | null>(value ?? today)
  const scheduleFocus = useCallback((callback: () => void) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback)
      return
    }
    setTimeout(callback, 0)
  }, [])

  const clampToMonth = useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, Math.min(day, daysInMonth))
  }, [])

  const closePicker = useCallback(
    (restoreFocus = true) => {
      setOpen(false)
      if (restoreFocus) {
        scheduleFocus(() => {
          triggerRef.current?.focus()
        })
      }
    },
    [scheduleFocus],
  )

  const resolveFocusableDate = useCallback(
    (preferred?: string | null) => {
      if (preferred && selectableDates.includes(preferred)) return preferred
      if (value && selectableDates.includes(value)) return value
      if (selectableDates.includes(today)) return today
      return selectableDates[0] ?? null
    },
    [selectableDates, today, value],
  )

  const focusDate = useCallback(
    (nextDate: string | null) => {
      if (!nextDate) return
      setFocusedDate(nextDate)
      scheduleFocus(() => {
        dayButtonRefs.current.get(nextDate)?.focus()
      })
    },
    [scheduleFocus],
  )

  const shiftDisplayMonth = useCallback(
    (offset: number) => {
      const baseDate = parseLocalDate(focusedDate ?? value ?? today) ?? new Date()
      const targetDate = clampToMonth(
        new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, baseDate.getDate()),
      )
      setDisplayMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1))
      setFocusedDate(toLocalDateStr(targetDate))
    },
    [clampToMonth, focusedDate, today, value],
  )

  const selectDate = useCallback(
    (nextDate: string) => {
      onChange(nextDate)
      closePicker()
    },
    [closePicker, onChange],
  )

  useEffect(() => {
    if (selectedDate) {
      setDisplayMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
    }
  }, [selectedDate])

  useEffect(() => {
    if (!open) return

    setFocusedDate((prev) => resolveFocusableDate(prev))

    const updateOverlayPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = 292
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const estimatedHeight = 330
      const left = Math.min(Math.max(12, rect.left), Math.max(12, viewportWidth - width - 12))
      const showAbove =
        rect.bottom + estimatedHeight > viewportHeight - 12 && rect.top > estimatedHeight
      const top = showAbove
        ? Math.max(12, rect.top - estimatedHeight - 8)
        : Math.min(viewportHeight - estimatedHeight - 12, rect.bottom + 8)
      setOverlayStyle({ top, left, width })
    }

    updateOverlayPosition()

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!containerRef.current?.contains(target) && !overlayRef.current?.contains(target)) {
        closePicker(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePicker()
    }

    window.addEventListener('resize', updateOverlayPosition)
    window.addEventListener('scroll', updateOverlayPosition, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('resize', updateOverlayPosition)
      window.removeEventListener('scroll', updateOverlayPosition, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [closePicker, open, resolveFocusableDate])

  useEffect(() => {
    if (!open) return
    const nextFocusedDate = resolveFocusableDate(focusedDate)
    if (nextFocusedDate !== focusedDate) {
      setFocusedDate(nextFocusedDate)
      return
    }
    if (nextFocusedDate) {
      scheduleFocus(() => {
        dayButtonRefs.current.get(nextFocusedDate)?.focus()
      })
    }
  }, [focusedDate, open, resolveFocusableDate, scheduleFocus])

  const handleDayKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, currentDate: string) => {
      const currentIndex = selectableDates.indexOf(currentDate)
      if (currentIndex < 0) return

      const currentCell = calendarDays.find((day) => day && toLocalDateStr(day) === currentDate)
      const moveToIndex = (nextIndex: number) => {
        const nextDate =
          selectableDates[Math.max(0, Math.min(nextIndex, selectableDates.length - 1))]
        focusDate(nextDate ?? null)
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          moveToIndex(currentIndex - 1)
          break
        case 'ArrowRight':
          event.preventDefault()
          moveToIndex(currentIndex + 1)
          break
        case 'ArrowUp':
          event.preventDefault()
          moveToIndex(currentIndex - 7)
          break
        case 'ArrowDown':
          event.preventDefault()
          moveToIndex(currentIndex + 7)
          break
        case 'Home':
          if (!currentCell) return
          event.preventDefault()
          moveToIndex(currentIndex - ((currentCell.getDay() + 6) % 7))
          break
        case 'End':
          if (!currentCell) return
          event.preventDefault()
          moveToIndex(currentIndex + (6 - ((currentCell.getDay() + 6) % 7)))
          break
        case 'PageUp':
          event.preventDefault()
          shiftDisplayMonth(-1)
          break
        case 'PageDown':
          event.preventDefault()
          shiftDisplayMonth(1)
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          selectDate(currentDate)
          break
        default:
          break
      }
    },
    [calendarDays, focusDate, selectDate, selectableDates, shiftDisplayMonth],
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => {
          setOpen((prev) => {
            const nextOpen = !prev
            if (nextOpen) {
              setFocusedDate(resolveFocusableDate(value))
            }
            return nextOpen
          })
        }}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-3 pr-14 text-left text-sm transition-colors hover:bg-accent/40"
      >
        <span className={cn('truncate', value ? 'text-foreground' : 'text-muted-foreground')}>
          {value ? formatDate(value, 'long') : label}
        </span>
      </button>
      {value && (
        <button
          type="button"
          aria-label={t('filterBar.clearDate', { label })}
          onClick={() => onChange(undefined)}
          className="absolute right-8 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={dialogId}
            ref={overlayRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={dialogLabelId}
            aria-describedby={dialogDescriptionId}
            className="fixed z-[999] rounded-xl border border-border/80 bg-card/98 p-3 shadow-2xl backdrop-blur-xl"
            style={{ top: overlayStyle.top, left: overlayStyle.left, width: overlayStyle.width }}
          >
            <div id={dialogLabelId} className="sr-only">
              {label}
            </div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftDisplayMonth(-1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={t('common.previousMonth')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div id={dialogDescriptionId} className="text-sm font-medium capitalize">
                {monthLabel}
              </div>
              <button
                type="button"
                onClick={() => shiftDisplayMonth(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={t('common.nextMonth')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {weekdayLabels.map((day) => (
                <div
                  key={day}
                  className="px-1 py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="h-9" />
                }

                const iso = toLocalDateStr(day)
                const isSelected = value === iso
                const isToday = iso === today

                return (
                  <button
                    key={iso}
                    ref={(node) => {
                      if (node) dayButtonRefs.current.set(iso, node)
                      else dayButtonRefs.current.delete(iso)
                    }}
                    type="button"
                    tabIndex={focusedDate === iso ? 0 : -1}
                    aria-pressed={isSelected}
                    onFocus={() => setFocusedDate(iso)}
                    onKeyDown={(event) => handleDayKeyDown(event, iso)}
                    onClick={() => selectDate(iso)}
                    className={cn(
                      'h-9 rounded-md text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isToday
                          ? 'border border-primary/50 bg-primary/10 text-foreground hover:bg-primary/15'
                          : 'text-foreground hover:bg-accent',
                    )}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange(undefined)
                  closePicker()
                }}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t('common.reset')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = today
                  setDisplayMonth(parseLocalDate(current) ?? new Date())
                  selectDate(current)
                }}
                className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t('common.today')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

type FilterVisualState = 'selected' | 'included' | 'inactive'

function getFilterVisualState(isSelected: boolean, hasSelection: boolean): FilterVisualState {
  if (isSelected) return 'selected'
  if (!hasSelection) return 'included'
  return 'inactive'
}

export function FilterBar({
  viewMode,
  onViewModeChange,
  selectedMonth,
  onMonthChange,
  availableMonths,
  availableProviders,
  selectedProviders,
  onToggleProvider,
  onClearProviders,
  allModels,
  selectedModels,
  onToggleModel,
  onClearModels,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyPreset,
  onResetAll,
}: FilterBarProps) {
  const { t } = useTranslation()
  const activePreset = useMemo(
    () => resolveActivePreset(selectedMonth, startDate, endDate),
    [selectedMonth, startDate, endDate],
  )

  const hasCustomFilters =
    selectedMonth !== null ||
    selectedProviders.length > 0 ||
    selectedModels.length > 0 ||
    Boolean(startDate || endDate) ||
    viewMode !== 'daily'

  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 px-3 py-3 backdrop-blur-xl">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-[0.14em]">{t('filterBar.status')}</span>
          <span className="rounded-full bg-muted/30 px-2 py-0.5">
            {selectedProviders.length > 0
              ? t('filterBar.providersActive', { count: selectedProviders.length })
              : t('common.allProviders')}
          </span>
          <span className="rounded-full bg-muted/30 px-2 py-0.5">
            {selectedModels.length > 0
              ? t('filterBar.modelsActive', { count: selectedModels.length })
              : t('common.allModels')}
          </span>
          {(startDate || endDate) && (
            <span className="rounded-full bg-muted/30 px-2 py-0.5">
              {t('filterBar.dateFilterActive')}
            </span>
          )}
          <button
            type="button"
            onClick={() => onResetAll()}
            className="ml-auto inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground transition-all duration-200 hover:bg-accent hover:border-accent disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border"
            disabled={!hasCustomFilters}
          >
            {t('filterBar.resetAll')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[160px_190px_1fr]">
          <Select value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
            <SelectTrigger className="w-full" aria-label={t('filterBar.viewModeLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['daily', 'monthly', 'yearly'] as ViewMode[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`viewModes.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth ?? 'all'}
            onValueChange={(v) => onMonthChange(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-full" aria-label={t('filterBar.focusMonthLabel')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allMonths')}</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonthYear(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-1.5">
            {[
              { key: '7d', label: t('filterBar.presets.7d') },
              { key: '30d', label: t('filterBar.presets.30d') },
              { key: 'month', label: t('filterBar.presets.month') },
              { key: 'year', label: t('filterBar.presets.year') },
              { key: 'all', label: t('filterBar.presets.all') },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={activePreset === p.key}
                onClick={() => onApplyPreset(p.key)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200 min-w-[48px]',
                  activePreset === p.key
                    ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'border-border hover:bg-accent hover:border-accent',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] md:items-center">
          <DatePickerField
            label={t('common.startDate')}
            onChange={onStartDateChange}
            {...(startDate ? { value: startDate } : {})}
          />
          <span className="hidden md:inline text-xs text-muted-foreground">
            {t('filterBar.until')}
          </span>
          <DatePickerField
            label={t('common.endDate')}
            onChange={onEndDateChange}
            {...(endDate ? { value: endDate } : {})}
          />
          <button
            type="button"
            onClick={() => {
              onStartDateChange(undefined)
              onEndDateChange(undefined)
            }}
            className="rounded-full px-3 py-2 text-xs font-medium border border-border transition-all duration-200 hover:bg-accent hover:border-accent"
          >
            {t('filterBar.resetDateRange')}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t('filterBar.providers')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableProviders.map((provider) => {
                const isSelected = selectedProviders.includes(provider)
                const visualState = getFilterVisualState(isSelected, selectedProviders.length > 0)
                const badgeStyle = getProviderBadgeStyle(provider)
                return (
                  <button
                    key={provider}
                    type="button"
                    data-filter-state={visualState}
                    aria-pressed={isSelected}
                    onClick={() => onToggleProvider(provider)}
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold cursor-pointer border transition-all duration-200',
                      visualState === 'selected'
                        ? getProviderBadgeClasses(provider)
                        : visualState === 'included'
                          ? 'border-border/70 bg-background/70 hover:bg-accent'
                          : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                    style={
                      visualState === 'selected'
                        ? badgeStyle
                        : visualState === 'included'
                          ? {
                              color: badgeStyle.color,
                              backgroundColor: badgeStyle.backgroundColor.replace(
                                /0\.10\)$/,
                                '0.05)',
                              ),
                              borderColor: badgeStyle.borderColor.replace(/0\.20\)$/, '0.14)'),
                            }
                          : undefined
                    }
                  >
                    {provider}
                  </button>
                )
              })}
              {selectedProviders.length > 0 && (
                <button
                  type="button"
                  onClick={onClearProviders}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-border transition-all duration-200 hover:bg-accent"
                >
                  {t('common.reset')}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t('filterBar.models')}
              </span>
              {selectedModels.length > 0 && (
                <button
                  type="button"
                  onClick={onClearModels}
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-border transition-all duration-200 hover:bg-accent"
                >
                  {t('filterBar.resetModels')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allModels.map((model) => {
                const isSelected = selectedModels.includes(model)
                const color = getModelColor(model)
                const visualState = getFilterVisualState(isSelected, selectedModels.length > 0)
                return (
                  <button
                    key={model}
                    type="button"
                    data-filter-state={visualState}
                    aria-pressed={isSelected}
                    onClick={() => onToggleModel(model)}
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer',
                      'border transition-all duration-200 hover:scale-[1.03]',
                      visualState === 'selected'
                        ? 'opacity-100'
                        : visualState === 'included'
                          ? 'opacity-85'
                          : 'opacity-40 hover:opacity-70',
                    )}
                    style={{
                      borderColor: color,
                      backgroundColor:
                        visualState === 'selected'
                          ? getModelColorAlpha(model, 0.16)
                          : visualState === 'included'
                            ? getModelColorAlpha(model, 0.08)
                            : 'transparent',
                      color: color,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: color }}
                    />
                    {model}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
