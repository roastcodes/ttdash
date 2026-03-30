import { useState, useEffect, useCallback } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => setIsDark(prev => !prev), [])

  return { isDark, toggle }
}
