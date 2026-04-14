import type * as React from 'react'
import { createContext, useContext, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { getMotionAwareClasses, useShouldReduceMotion } from '@/lib/motion'

interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** Provides global toast state and live-region rendering. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const shouldReduceMotion = useShouldReduceMotion()
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
            className={`rounded-lg border border-border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${getMotionAwareClasses(
              shouldReduceMotion,
              'animate-in slide-in-from-bottom-2 fade-in-0',
            )} ${
              toast.type === 'error'
                ? 'bg-destructive/90 text-destructive-foreground'
                : toast.type === 'success'
                  ? 'bg-primary/90 text-primary-foreground'
                  : 'bg-card/95 text-card-foreground'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">{toast.message}</div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={t('common.close')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** Returns the shared toast API. */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
