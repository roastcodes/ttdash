import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/ui/toast'
import { Dashboard } from '@/components/Dashboard'
import { fetchSettings } from '@/lib/api'
import { AppMotionProvider } from '@/lib/motion'
import type { AppSettings } from '@/types'

interface AppProps {
  initialSettings: AppSettings
  initialSettingsError?: string | null
  initialSettingsLoadedFromServer?: boolean
  initialSettingsFetchedAt?: number | null
}

function AppSettingsMotionProvider({
  initialSettings,
  initialSettingsLoadedFromServer,
  initialSettingsFetchedAt,
  children,
}: {
  initialSettings: AppSettings
  initialSettingsLoadedFromServer: boolean
  initialSettingsFetchedAt: number | null
  children: ReactNode
}) {
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5,
    initialData: initialSettings,
    initialDataUpdatedAt:
      initialSettingsLoadedFromServer && typeof initialSettingsFetchedAt === 'number'
        ? initialSettingsFetchedAt
        : 0,
  })

  return (
    <AppMotionProvider preference={(settingsQuery.data ?? initialSettings).reducedMotionPreference}>
      {children}
    </AppMotionProvider>
  )
}

/** Boots the app providers and renders the dashboard shell. */
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
      <AppSettingsMotionProvider
        initialSettings={initialSettings}
        initialSettingsLoadedFromServer={initialSettingsLoadedFromServer}
        initialSettingsFetchedAt={initialSettingsFetchedAt}
      >
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
      </AppSettingsMotionProvider>
    </QueryClientProvider>
  )
}
