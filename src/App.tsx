import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ToastProvider } from '@/components/ui/toast'
import { Dashboard } from '@/components/Dashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider>
          <Dashboard />
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
