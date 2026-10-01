import { useRef, type ReactNode } from 'react'
import { DialogContent, DialogDescription, DialogTitle } from './dialog'
import { cn } from '@/lib/cn'

interface ZoomDialogContentProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string | undefined
  testId?: string
}

/** Gives expanded analyses one fixed header and one viewport-sized scrolling body. */
export function ZoomDialogContent({
  title,
  description,
  actions,
  children,
  className,
  testId,
}: ZoomDialogContentProps) {
  const returnFocus = useRef<HTMLElement | null>(null)
  return (
    <DialogContent
      data-testid={testId}
      onOpenAutoFocus={(event) => {
        returnFocus.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null
        const close = (event.target as HTMLElement).querySelector<HTMLElement>(
          '[data-dialog-close]',
        )
        if (close) {
          event.preventDefault()
          close.focus()
        }
      }}
      onCloseAutoFocus={(event) => {
        if (!returnFocus.current?.isConnected) return
        event.preventDefault()
        returnFocus.current.focus({ preventScroll: true })
      }}
      className={cn(
        'top-4 flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[1600px] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:top-6 sm:h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]',
        className,
      )}
    >
      <div className="shrink-0 border-b border-border/60 px-4 py-4 pr-16 sm:px-6 sm:pr-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="text-lg break-words">{title}</DialogTitle>
            <DialogDescription className={description ? 'mt-1 max-w-3xl' : 'sr-only'}>
              {description ?? title}
            </DialogDescription>
          </div>
          {actions}
        </div>
      </div>
      <div
        data-zoom-scroll
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
      >
        {children}
      </div>
    </DialogContent>
  )
}
