import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchToktrackVersionStatus } from '@/lib/api'
import { TOKTRACK_VERSION } from '@/lib/toktrack-version'
import type { ToktrackVersionStatus } from '@/types'

/** Describes the toktrack version state owned by the settings modal. */
export type SettingsToktrackVersionState = ToktrackVersionStatus & {
  isLoading: boolean
}

/** Describes the toktrack version data rendered inside the settings modal. */
export interface SettingsVersionStatusViewModel {
  configuredVersion: string
  statusLabel: string
  statusToneClass: string
  state: SettingsToktrackVersionState
}

const DEFAULT_TOKTRACK_VERSION_STATE: SettingsToktrackVersionState = {
  configuredVersion: TOKTRACK_VERSION,
  latestVersion: null,
  isLatest: null,
  lookupStatus: 'ok',
  isLoading: true,
}

/** Loads and formats the toktrack version status shown in the settings modal. */
export function useSettingsModalVersionStatus(open: boolean): SettingsVersionStatusViewModel {
  const { t } = useTranslation()
  const [state, setState] = useState<SettingsToktrackVersionState>(DEFAULT_TOKTRACK_VERSION_STATE)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setState(DEFAULT_TOKTRACK_VERSION_STATE)

    void fetchToktrackVersionStatus()
      .then((status) => {
        if (cancelled) return

        setState({
          ...status,
          configuredVersion: status.configuredVersion || TOKTRACK_VERSION,
          isLoading: false,
        })
      })
      .catch(() => {
        if (cancelled) return

        setState({
          configuredVersion: TOKTRACK_VERSION,
          latestVersion: null,
          isLatest: null,
          lookupStatus: 'failed',
          message: t('settings.modal.toktrackLatestCheckFailed'),
          isLoading: false,
        })
      })

    return () => {
      cancelled = true
    }
  }, [open, t])

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
