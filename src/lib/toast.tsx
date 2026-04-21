import { createContext, useContext } from 'react'

/** Describes one toast message rendered in the shared live region. */
export interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
}

/** Exposes the shared toast state and mutation helpers. */
export interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

/** Stores the global toast state used by the dashboard shell. */
export const ToastContext = createContext<ToastContextValue | null>(null)

/** Returns the shared toast API. */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
