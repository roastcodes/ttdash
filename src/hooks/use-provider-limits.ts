import { useEffect, useState } from 'react'
import { PROVIDER_LIMIT_STORAGE_KEY, syncProviderLimits } from '@/lib/provider-limits'
import type { ProviderLimits } from '@/types'

function readStoredProviderLimits(): unknown {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(PROVIDER_LIMIT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function useProviderLimits(availableProviders: string[]) {
  const [limits, setLimits] = useState<ProviderLimits>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setLimits(syncProviderLimits(availableProviders, readStoredProviderLimits()))
    setHydrated(true)
  }, [availableProviders])

  useEffect(() => {
    if (typeof window === 'undefined' || !hydrated || availableProviders.length === 0) return
    window.localStorage.setItem(PROVIDER_LIMIT_STORAGE_KEY, JSON.stringify(syncProviderLimits(availableProviders, limits)))
  }, [availableProviders, hydrated, limits])

  return {
    limits,
    setLimits,
  }
}
