import { useMemo, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getToktrackVersionStatusSnapshot,
  subscribeToktrackVersionStatus,
  type ToktrackVersionStatusSnapshot,
} from '@/lib/toktrack-version-status'

/** Describes the toktrack version state owned by the settings modal. */
export type SettingsToktrackVersionState = ToktrackVersionStatusSnapshot

/** Describes the toktrack version data rendered inside the settings modal. */
export interface SettingsVersionStatusViewModel {
  configuredVersion: string
  statusLabel: string
  statusToneClass: string
  state: SettingsToktrackVersionState
}

/** Formats the session-wide toktrack version status shown in the settings modal. */
export function useSettingsModalVersionStatus(): SettingsVersionStatusViewModel {
  const { t } = useTranslation()
  const state = useSyncExternalStore(
    subscribeToktrackVersionStatus,
    getToktrackVersionStatusSnapshot,
    getToktrackVersionStatusSnapshot,
  )

  const statusToneClass = useMemo(() => {
    if (state.isLoading) return 'text-muted-foreground'
    if (state.lookupStatus === 'failed' || state.isLatest === false) return 'text-amber-500'
    return 'text-green-500'
  }, [state.isLatest, state.isLoading, state.lookupStatus])

  const statusLabel = useMemo(() => {
    if (state.isLoading) return t('settings.modal.toktrackCheckingLatest')
    if (state.lookupStatus === 'failed') return t('settings.modal.toktrackLatestCheckFailed')
    if (state.isLatest) return t('settings.modal.toktrackLatest')

    return t('settings.modal.toktrackUpdateAvailable', {
      version: state.latestVersion ?? t('common.notAvailable'),
    })
  }, [state.isLatest, state.isLoading, state.latestVersion, state.lookupStatus, t])

  return {
    configuredVersion: state.configuredVersion,
    statusLabel,
    statusToneClass,
    state,
  }
}
