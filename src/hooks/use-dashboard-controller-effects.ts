import { useEffect } from 'react'
import type { i18n as I18n } from 'i18next'
import { applyTheme } from '@/lib/app-settings'
import { registerDashboardOpenSettingsHandler } from '@/hooks/use-dashboard-controller-browser'
import type { AppLanguage, AppTheme } from '@/types'

interface DashboardControllerEffectsParams {
  theme: AppTheme
  language: AppLanguage
  i18n: I18n
  bootstrapSettingsError: string | null
  hasFetchedAfterMount: boolean
  settingsError: unknown
  onClearBootstrapSettingsError: () => void
  onOpenSettings: () => void
}

/** Applies dashboard side effects that should stay outside the main controller composition. */
export function useDashboardControllerEffects({
  theme,
  language,
  i18n,
  bootstrapSettingsError,
  hasFetchedAfterMount,
  settingsError,
  onClearBootstrapSettingsError,
  onOpenSettings,
}: DashboardControllerEffectsParams) {
  useEffect(() => {
    if (bootstrapSettingsError && hasFetchedAfterMount && !settingsError) {
      onClearBootstrapSettingsError()
    }
  }, [bootstrapSettingsError, hasFetchedAfterMount, onClearBootstrapSettingsError, settingsError])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (i18n.resolvedLanguage !== language) {
      void i18n.changeLanguage(language)
    }
  }, [i18n, language])

  useEffect(() => registerDashboardOpenSettingsHandler(onOpenSettings), [onOpenSettings])
}
