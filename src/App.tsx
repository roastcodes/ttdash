import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/ui/toast'
import { Dashboard } from '@/components/Dashboard'
import type { AppSettings } from '@/types'

interface AppProps {
  initialSettings: AppSettings
}

export function App({ initialSettings }: AppProps) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    })
    client.setQueryData(['settings'], initialSettings)
    return client
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider delayDuration={100}>
          <Dashboard />
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
