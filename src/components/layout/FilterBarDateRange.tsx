import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDate, localToday, toLocalDateStr } from '@/lib/formatters'
import { getCurrentLocale } from '@/lib/i18n'
import {
  buildCalendarDayMap,
  buildCalendarDays,
  buildWeekdayLabels,
  clampDateToTargetMonth,
  getSelectableDates,
  parseLocalDate,
  resolveDatePickerKeyboardAction,
  resolveFocusableDate as resolveDatePickerFocusableDate,
} from '@/lib/filter-date-picker-data'

interface FilterBarDateRangeProps {
  startDate: string | undefined
  endDate: string | undefined
  onStartDateChange: (date: string | undefined) => void
  onEndDateChange: (date: string | undefined) => void
}

interface DatePickerFieldProps {
  label: string
  value?: string
  onChange: (date: string | undefined) => void
}

function DatePickerField({ label, value, onChange }: DatePickerFieldProps) {
  const { t } = useTranslation()
  const locale = getCurrentLocale()
  const dialogId = useId()
  const dialogLabelId = useId()
  const dialogDescriptionId = useId()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const scheduledFocusRef = useRef<{ kind: 'raf' | 'timeout'; id: number } | null>(null)
  const [overlayStyle, setOverlayStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 292,
  })
  const selectedDate = useMemo(() => parseLocalDate(value), [value])
  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => selectedDate ?? parseLocalDate(localToday()) ?? new Date(),
  )

  const weekdayLabels = useMemo(() => buildWeekdayLabels(locale), [locale])

  const monthLabel = useMemo(
    () => displayMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    [displayMonth, locale],
  )

  const calendarDays = useMemo(() => buildCalendarDays(displayMonth), [displayMonth])
  const selectableDates = useMemo(() => getSelectableDates(calendarDays), [calendarDays])
  const calendarDayByIso = useMemo(() => buildCalendarDayMap(calendarDays), [calendarDays])
  const today = useMemo(() => localToday(), [])
  const [focusedDate, setFocusedDate] = useState<string | null>(value ?? today)
  const clearScheduledFocus = useCallback(() => {
    const scheduledFocus = scheduledFocusRef.current
    if (!scheduledFocus) return

    if (
      scheduledFocus.kind === 'raf' &&
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
    ) {
      window.cancelAnimationFrame(scheduledFocus.id)
    } else {
      clearTimeout(scheduledFocus.id)
    }

    scheduledFocusRef.current = null
  }, [])
  const scheduleFocus = useCallback(
    (callback: () => void) => {
      clearScheduledFocus()

      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        const id = window.requestAnimationFrame(() => {
          scheduledFocusRef.current = null
          callback()
        })
        scheduledFocusRef.current = { kind: 'raf', id }
        return
      }

      const id = (typeof window !== 'undefined' ? window.setTimeout : setTimeout)(() => {
        scheduledFocusRef.current = null
        callback()
      }, 0)
      scheduledFocusRef.current = { kind: 'timeout', id }
    },
    [clearScheduledFocus],
  )

  useEffect(() => clearScheduledFocus, [clearScheduledFocus])

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
      return resolveDatePickerFocusableDate({ preferred, value, selectableDates, today })
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
      const targetDate = clampDateToTargetMonth(baseDate, offset)
      setDisplayMonth(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1))
      setFocusedDate(toLocalDateStr(targetDate))
    },
    [focusedDate, today, value],
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
      const preferredTop = showAbove ? rect.top - estimatedHeight - 8 : rect.bottom + 8
      const maxTop = Math.max(12, viewportHeight - estimatedHeight - 12)
      const top = Math.min(Math.max(12, preferredTop), maxTop)
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
      const action = resolveDatePickerKeyboardAction({
        key: event.key,
        currentDate,
        selectableDates,
        calendarDayByIso,
      })
      if (action.kind === 'none') return

      event.preventDefault()
      if (action.kind === 'focus') {
        focusDate(action.date)
      } else if (action.kind === 'shift-month') {
        shiftDisplayMonth(action.offset)
      } else {
        selectDate(action.date)
      }
    },
    [calendarDayByIso, focusDate, selectDate, selectableDates, shiftDisplayMonth],
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
          className="absolute top-1/2 right-8 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <CalendarDays className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

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
              {weekdayLabels.map((day, index) => (
                <div
                  key={`weekday-${index}-${day}`}
                  className="px-1 py-1 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
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
                const dayLabel = formatDate(iso, 'long')

                return (
                  <button
                    key={iso}
                    ref={(node) => {
                      if (node) dayButtonRefs.current.set(iso, node)
                      else dayButtonRefs.current.delete(iso)
                    }}
                    type="button"
                    tabIndex={focusedDate === iso ? 0 : -1}
                    aria-label={dayLabel}
                    aria-current={isToday ? 'date' : undefined}
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

/** Renders explicit start/end date controls and their reset action. */
export function FilterBarDateRange({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: FilterBarDateRangeProps) {
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('filterBar.groups.dateRange')}
      className="rounded-2xl border border-border/50 bg-muted/15 p-3"
    >
      <div className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {t('filterBar.groups.dateRange')}
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] md:items-center">
        <DatePickerField
          label={t('common.startDate')}
          onChange={onStartDateChange}
          {...(startDate ? { value: startDate } : {})}
        />
        <span className="hidden text-xs text-muted-foreground md:inline">
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
          className="rounded-full border border-border px-3 py-2 text-xs font-medium transition-all duration-200 hover:border-accent hover:bg-accent"
        >
          {t('filterBar.resetDateRange')}
        </button>
      </div>
    </section>
  )
}
