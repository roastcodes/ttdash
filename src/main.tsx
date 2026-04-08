import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { DEFAULT_APP_SETTINGS, applyTheme, normalizeAppSettings } from './lib/app-settings'
import { initI18n } from './lib/i18n'
import './index.css'

async function loadInitialSettings() {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) return DEFAULT_APP_SETTINGS
    return normalizeAppSettings(await res.json())
  } catch {
    return DEFAULT_APP_SETTINGS
  }
}

async function bootstrap() {
  const initialSettings = await loadInitialSettings()
  applyTheme(initialSettings.theme)
  await initI18n(initialSettings.language)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App initialSettings={initialSettings} />
    </StrictMode>,
  )
}

void bootstrap()
