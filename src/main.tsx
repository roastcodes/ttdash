import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { applyTheme } from './lib/app-settings'
import { loadBootstrapSettings } from './lib/api'
import { initI18n } from './lib/i18n'
import './index.css'

async function bootstrap() {
  const { settings: initialSettings, errorMessage: initialSettingsError } =
    await loadBootstrapSettings()
  applyTheme(initialSettings.theme)
  await initI18n(initialSettings.language)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App initialSettings={initialSettings} initialSettingsError={initialSettingsError} />
    </StrictMode>,
  )
}

void bootstrap()
