import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AppLanguage,
  AppSettings,
  AppTheme,
  DashboardDefaultFilters,
  DashboardSectionOrder,
  DashboardSectionVisibility,
  ProviderLimits,
} from '@/types'
import { fetchSettings, updateSettings, type UpdateSettingsRequest } from '@/lib/api'
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from '@/lib/app-settings'
import { syncProviderLimits } from '@/lib/provider-limits'

function mergeSettings(previous: AppSettings, patch: UpdateSettingsRequest): AppSettings {
  return normalizeAppSettings({
    ...previous,
    ...patch,
    providerLimits: patch.providerLimits ?? previous.providerLimits,
  })
}

export function useAppSettings(availableProviders: string[]) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5,
  })

  const mutation = useMutation({
    mutationFn: (patch: UpdateSettingsRequest) => updateSettings(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] })
      const previous = queryClient.getQueryData<AppSettings>(['settings']) ?? DEFAULT_APP_SETTINGS
      queryClient.setQueryData(['settings'], mergeSettings(previous, patch))
      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settings'], context.previous)
      }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['settings'], settings)
    },
  })

  const settings = query.data ?? DEFAULT_APP_SETTINGS
  const providerLimits = useMemo(
    () => syncProviderLimits(availableProviders, settings.providerLimits),
    [availableProviders, settings.providerLimits],
  )

  const setTheme = useCallback((theme: AppTheme) => mutation.mutateAsync({ theme }), [mutation])
  const setLanguage = useCallback(
    (language: AppLanguage) => mutation.mutateAsync({ language }),
    [mutation],
  )
  const setProviderLimits = useCallback(
    (limits: ProviderLimits) => mutation.mutateAsync({ providerLimits: limits }),
    [mutation],
  )
  const setDefaultFilters = useCallback(
    (defaultFilters: DashboardDefaultFilters) => mutation.mutateAsync({ defaultFilters }),
    [mutation],
  )
  const setSectionVisibility = useCallback(
    (sectionVisibility: DashboardSectionVisibility) => mutation.mutateAsync({ sectionVisibility }),
    [mutation],
  )
  const setSectionOrder = useCallback(
    (sectionOrder: DashboardSectionOrder) => mutation.mutateAsync({ sectionOrder }),
    [mutation],
  )
  const saveSettings = useCallback(
    (patch: UpdateSettingsRequest) => mutation.mutateAsync(patch),
    [mutation],
  )

  return {
    settings,
    providerLimits,
    setTheme,
    setLanguage,
    setProviderLimits,
    setDefaultFilters,
    setSectionVisibility,
    setSectionOrder,
    saveSettings,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: query.error,
    isError: query.isError,
    hasFetchedAfterMount: query.isFetchedAfterMount,
  }
}
