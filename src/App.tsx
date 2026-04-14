import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/ui/toast'
import { Dashboard } from '@/components/Dashboard'
import type { AppSettings } from '@/types'

interface AppProps {
  initialSettings: AppSettings
  initialSettingsError?: string | null
  initialSettingsLoadedFromServer?: boolean
  initialSettingsFetchedAt?: number | null
}

export function App({
  initialSettings,
  initialSettingsError = null,
  initialSettingsLoadedFromServer = false,
  initialSettingsFetchedAt = null,
}: AppProps) {
  const [queryClient] = useState(() => {
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    })
  })

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <TooltipProvider delayDuration={100}>
            <Dashboard
              initialSettings={initialSettings}
              initialSettingsError={initialSettingsError}
              initialSettingsLoadedFromServer={initialSettingsLoadedFromServer}
              initialSettingsFetchedAt={initialSettingsFetchedAt}
            />
          </TooltipProvider>
        </ToastProvider>
      </MotionConfig>
    </QueryClientProvider>
  )
}
