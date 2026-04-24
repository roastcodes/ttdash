import { useCallback, useState } from 'react'

/** Groups the local open state for dashboard-owned dialogs and panels. */
export interface DashboardControllerDialogState {
  helpOpen: boolean
  autoImportOpen: boolean
  settingsOpen: boolean
  openHelp: () => void
  openAutoImport: () => void
  openSettings: () => void
  setHelpOpen: (open: boolean) => void
  setAutoImportOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
}

/** Owns the dashboard-local dialog open states and explicit open actions. */
export function useDashboardControllerDialogs(): DashboardControllerDialogState {
  const [helpOpen, setHelpOpen] = useState(false)
  const [autoImportOpen, setAutoImportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const openHelp = useCallback(() => {
    setHelpOpen(true)
  }, [])

  const openAutoImport = useCallback(() => {
    setAutoImportOpen(true)
  }, [])

  const openSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  return {
    helpOpen,
    autoImportOpen,
    settingsOpen,
    openHelp,
    openAutoImport,
    openSettings,
    setHelpOpen,
    setAutoImportOpen,
    setSettingsOpen,
  }
}
