import { useEffect, useState } from 'react'
import { syncProviderLimits } from '@/lib/provider-limits'
import type { ProviderLimits } from '@/types'

export function useProviderLimits(availableProviders: string[]) {
  const [limits, setLimits] = useState<ProviderLimits>({})

  useEffect(() => {
    setLimits(prev => syncProviderLimits(availableProviders, prev))
  }, [availableProviders])

  return {
    limits,
    setLimits,
  }
}
