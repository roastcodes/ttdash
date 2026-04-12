export interface CheckEvent {
  tool: string
  status: string
  method?: string
  version?: string
}
export interface ProgressEvent {
  message: string
}
export interface StderrEvent {
  line: string
}
export interface SuccessEvent {
  days: number
  totalCost: number
}
export interface ErrorEvent {
  message: string
}

type AutoImportTranslationVars = Record<string, string | number>
type AutoImportTranslator = (key: string, vars?: AutoImportTranslationVars) => string

function parseEventData<T>(event: Event): T | null {
  if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
    return null
  }

  const data: unknown = JSON.parse(event.data)
  return data as T
}

function translateAutoImportMessage(message: string, t: AutoImportTranslator) {
  if (message === 'Starte lokalen toktrack-Import...') {
    return t('autoImportModal.startingLocalImport')
  }

  if (message.startsWith('Lade Nutzungsdaten via ')) {
    return t('autoImportModal.loadingUsageData', {
      command: message.replace('Lade Nutzungsdaten via ', '').replace(/\.\.\.$/, ''),
    })
  }

  const processingMatch = message.match(/^Verarbeite Nutzungsdaten\.\.\. \((\d+)s\)$/)
  if (processingMatch) {
    return t('autoImportModal.processingUsageData', { seconds: processingMatch[1] ?? '0' })
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

export function startAutoImport(
  callbacks: {
    onCheck: (data: CheckEvent) => void
    onProgress: (data: ProgressEvent) => void
    onStderr: (data: StderrEvent) => void
    onSuccess: (data: SuccessEvent) => void
    onError: (data: ErrorEvent) => void
    onDone: () => void
  },
  t: AutoImportTranslator = (key) => key,
): { close: () => void } {
  const es = new EventSource('/api/auto-import/stream')

  es.addEventListener('check', (event) => {
    const data = parseEventData<CheckEvent>(event)
    if (data) {
      callbacks.onCheck(data)
    }
  })
  es.addEventListener('progress', (event) => {
    const data = parseEventData<ProgressEvent>(event)
    if (data) {
      callbacks.onProgress({ ...data, message: translateAutoImportMessage(data.message, t) })
    }
  })
  es.addEventListener('stderr', (event) => {
    const data = parseEventData<StderrEvent>(event)
    if (data) {
      callbacks.onStderr({ ...data, line: translateAutoImportMessage(data.line, t) })
    }
  })
  es.addEventListener('success', (event) => {
    const data = parseEventData<SuccessEvent>(event)
    if (data) {
      callbacks.onSuccess(data)
    }
  })
  es.addEventListener('error', (event) => {
    // SSE 'error' can be both our custom event and a connection error
    const data = parseEventData<ErrorEvent>(event)
    if (data) {
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
