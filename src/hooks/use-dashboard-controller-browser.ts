import type { DashboardTestHooks } from '@/types/dashboard-controller'

const DOWNLOAD_REVOKE_DELAY_MS = 1000

type DashboardTestWindow = Window & {
  __TTDASH_TEST_HOOKS__?: DashboardTestHooks
}

function getDashboardTestWindow(): DashboardTestWindow | null {
  if (typeof window === 'undefined') return null
  return window
}

function triggerDownload(blob: Blob, filename: string) {
  if (typeof document === 'undefined') return

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_REVOKE_DELAY_MS)
}

/** Emits a JSON download through the browser and optional dashboard test hooks. */
export function downloadJsonFile(filename: string, data: unknown) {
  const text = JSON.stringify(data, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  getDashboardTestWindow()?.__TTDASH_TEST_HOOKS__?.onJsonDownload?.({
    filename,
    mimeType: blob.type,
    size: blob.size,
    text,
  })
  triggerDownload(blob, filename)
}

/** Downloads a blob through a temporary browser anchor. */
export function downloadBlobFile(filename: string, blob: Blob) {
  triggerDownload(blob, filename)
}

/** Scrolls smoothly to a dashboard section when it exists in the current document. */
export function scrollToSection(sectionId: string) {
  if (typeof document === 'undefined') return
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Registers the dashboard test hook that opens settings from browser tests. */
export function registerDashboardOpenSettingsHandler(onOpenSettings: () => void) {
  const globalWindow = getDashboardTestWindow()

  if (!globalWindow?.__TTDASH_TEST_HOOKS__) {
    return () => {}
  }

  globalWindow.__TTDASH_TEST_HOOKS__.openSettings = onOpenSettings

  return () => {
    if (globalWindow.__TTDASH_TEST_HOOKS__?.openSettings === onOpenSettings) {
      delete globalWindow.__TTDASH_TEST_HOOKS__.openSettings
    }
  }
}
