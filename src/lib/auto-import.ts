export interface CheckEvent { tool: string; status: string; method?: string; version?: string }
export interface ProgressEvent { message: string }
export interface StderrEvent { line: string }
export interface SuccessEvent { days: number; totalCost: number }
export interface ErrorEvent { message: string }

function translateAutoImportMessage(message, t) {
  if (message === 'Starte lokalen toktrack-Import...') {
    return t('autoImportModal.startingLocalImport')
  }

  if (message.startsWith('Lade Nutzungsdaten via ')) {
    return t('autoImportModal.loadingUsageData', { command: message.replace('Lade Nutzungsdaten via ', '').replace(/\.\.\.$/, '') })
  }

  const processingMatch = message.match(/^Verarbeite Nutzungsdaten\.\.\. \((\d+)s\)$/)
  if (processingMatch) {
    return t('autoImportModal.processingUsageData', { seconds: processingMatch[1] })
  }

  if (message === 'Verbindung zum Server verloren.') {
    return t('autoImportModal.serverConnectionLost')
  }

  if (message === 'Ein Auto-Import läuft bereits. Bitte warten.') {
    return t('autoImportModal.autoImportRunning')
  }

  if (message === 'Kein lokales toktrack, Bun oder npm exec gefunden.') {
    return t('autoImportModal.noRunnerFound')
  }

  if (message.startsWith('Fehler: ')) {
    return t('autoImportModal.errorPrefix', { message: message.replace(/^Fehler: /, '') })
  }

  return message
}

export function startAutoImport(callbacks: {
  onCheck: (data: CheckEvent) => void
  onProgress: (data: ProgressEvent) => void
  onStderr: (data: StderrEvent) => void
  onSuccess: (data: SuccessEvent) => void
  onError: (data: ErrorEvent) => void
  onDone: () => void
}, t = (key, vars) => key): { close: () => void } {
  const es = new EventSource('/api/auto-import/stream')

  es.addEventListener('check', (e) => {
    callbacks.onCheck(JSON.parse(e.data))
  })
  es.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data)
    callbacks.onProgress({ ...data, message: translateAutoImportMessage(data.message, t) })
  })
  es.addEventListener('stderr', (e) => {
    const data = JSON.parse(e.data)
    callbacks.onStderr({ ...data, line: translateAutoImportMessage(data.line, t) })
  })
  es.addEventListener('success', (e) => {
    callbacks.onSuccess(JSON.parse(e.data))
  })
  es.addEventListener('error', (e) => {
    // SSE 'error' can be both our custom event and a connection error
    if (e instanceof MessageEvent && e.data) {
      const data = JSON.parse(e.data)
      callbacks.onError({ ...data, message: translateAutoImportMessage(data.message, t) })
    } else {
      callbacks.onError({ message: t('autoImportModal.serverConnectionLost') })
      es.close()
      callbacks.onDone()
    }
  })
  es.addEventListener('done', () => {
    es.close()
    callbacks.onDone()
  })

  return {
    close: () => {
      es.close()
    },
  }
}
