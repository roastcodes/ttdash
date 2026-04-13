import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { DEFAULT_APP_SETTINGS, applyTheme, normalizeAppSettings } from './lib/app-settings'
import { initI18n } from './lib/i18n'
import type { AppSettings } from './types'
import './index.css'

interface InitialSettingsLoadResult {
  settings: AppSettings
  errorMessage: string | null
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as { message?: string }
    return typeof payload.message === 'string' && payload.message.trim() ? payload.message : null
  } catch {
    return null
  }
}

async function loadInitialSettings() {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) {
      return {
        settings: DEFAULT_APP_SETTINGS,
        errorMessage: await readErrorMessage(res),
      } satisfies InitialSettingsLoadResult
    }

    return {
      settings: normalizeAppSettings(await res.json()),
      errorMessage: null,
    } satisfies InitialSettingsLoadResult
  } catch {
    return {
      settings: DEFAULT_APP_SETTINGS,
      errorMessage: null,
    } satisfies InitialSettingsLoadResult
  }
}

async function bootstrap() {
  const { settings: initialSettings, errorMessage: initialSettingsError } =
    await loadInitialSettings()
  applyTheme(initialSettings.theme)
  await initI18n(initialSettings.language)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App initialSettings={initialSettings} initialSettingsError={initialSettingsError} />
    </StrictMode>,
  )
}

void bootstrap()
