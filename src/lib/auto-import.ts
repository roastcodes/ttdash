export interface CheckEvent {
  tool: string
  status: string
  method?: string
  version?: string
}
type AutoImportMessageKey =
  | 'startingLocalImport'
  | 'loadingUsageData'
  | 'processingUsageData'
  | 'serverConnectionLost'
  | 'autoImportRunning'
  | 'noRunnerFound'
  | 'errorPrefix'

type AutoImportMessageEvent = {
  key: AutoImportMessageKey
  vars?: Record<string, string | number>
}

export interface ProgressEvent {
  key: AutoImportMessageKey
  vars?: Record<string, string | number>
}
export interface ProgressMessage {
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
  key: AutoImportMessageKey
  vars?: Record<string, string | number>
}
export interface ErrorMessage {
  message: string
}

type AutoImportTranslationVars = Record<string, string | number>
type AutoImportTranslator = (key: string, vars?: AutoImportTranslationVars) => string

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseEventData<T>(event: Event): T | null {
  if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
    return null
  }

  try {
    const data: unknown = JSON.parse(event.data)
    return isPlainObject(data) ? (data as T) : null
  } catch {
    return null
  }
}

export function translateAutoImportEvent(event: AutoImportMessageEvent, t: AutoImportTranslator) {
  switch (event.key) {
    case 'startingLocalImport':
      return t('autoImportModal.startingLocalImport')
    case 'loadingUsageData':
      return t('autoImportModal.loadingUsageData', {
        command: String(event.vars?.['command'] ?? ''),
      })
    case 'processingUsageData':
      return t('autoImportModal.processingUsageData', {
        seconds: String(event.vars?.['seconds'] ?? '0'),
      })
    case 'serverConnectionLost':
      return t('autoImportModal.serverConnectionLost')
    case 'autoImportRunning':
      return t('autoImportModal.autoImportRunning')
    case 'noRunnerFound':
      return t('autoImportModal.noRunnerFound')
    case 'errorPrefix':
      return t('autoImportModal.errorPrefix', {
        message: String(event.vars?.['message'] ?? ''),
      })
    default:
      return event.key
  }
}

export function startAutoImport(
  callbacks: {
    onCheck: (data: CheckEvent) => void
    onProgress: (data: ProgressMessage) => void
    onStderr: (data: StderrEvent) => void
    onSuccess: (data: SuccessEvent) => void
    onError: (data: ErrorMessage) => void
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
      callbacks.onProgress({
        ...data,
        message: translateAutoImportEvent(data, t),
      })
    }
  })
  es.addEventListener('stderr', (event) => {
    const data = parseEventData<StderrEvent>(event)
    if (data) {
      callbacks.onStderr(data)
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
      callbacks.onError({
        message: translateAutoImportEvent(data, t),
      })
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
