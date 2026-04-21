import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  render,
  renderHook,
  type RenderHookOptions,
  type RenderOptions,
} from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'

type RenderWithTooltipOptions = RenderOptions & {
  delayDuration?: number
}

type RenderHookWithQueryClientOptions<Props> = Omit<RenderHookOptions<Props>, 'wrapper'> & {
  client?: QueryClient
}

export function renderWithAppProviders(
  ui: ReactElement,
  { delayDuration = 0, ...options }: RenderWithTooltipOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <TooltipProvider delayDuration={delayDuration}>{children}</TooltipProvider>
  }

  return render(ui, {
    wrapper: Wrapper,
    ...options,
  })
}

export function renderWithTooltip(ui: ReactElement, options: RenderWithTooltipOptions = {}) {
  return renderWithAppProviders(ui, options)
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function createQueryClientWrapper(client = createTestQueryClient()) {
  return function QueryClientWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

export function renderHookWithQueryClient<Result, Props>(
  renderCallback: (initialProps: Props) => Result,
  { client = createTestQueryClient(), ...options }: RenderHookWithQueryClientOptions<Props> = {},
) {
  return renderHook(renderCallback, {
    wrapper: createQueryClientWrapper(client),
    ...options,
  })
}
