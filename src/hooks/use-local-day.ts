import { useEffect, useState } from 'react'
import { localToday } from '@/lib/formatters'

/** Keeps calendar-dependent views current after midnight and when returning to the app. */
export function useLocalDay(): string {
  const [day, setDay] = useState(localToday)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      setDay(localToday())
      clearTimeout(timer)
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      timer = setTimeout(refresh, Math.max(1, midnight.getTime() - Date.now()))
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return day
}
