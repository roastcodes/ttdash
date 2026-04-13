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
type StreamEventType = 'check' | 'progress' | 'stderr' | 'success' | 'error' | 'done'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJsonRecord<T>(value: string): T | null {
  try {
    const data: unknown = JSON.parse(value)
    return isPlainObject(data) ? (data as T) : null
  } catch {
    return null
  }
}

export function parseEventData<T>(event: Event): T | null {
  if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
    return null
  }

  return parseJsonRecord<T>(event.data)
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
  const controller = new AbortController()
  const decoder = new TextDecoder()
  let done = false

  const finish = () => {
    if (done) return
    done = true
    callbacks.onDone()
  }

  const dispatchEvent = (type: StreamEventType, dataText: string) => {
    switch (type) {
      case 'check': {
        const data = parseJsonRecord<CheckEvent>(dataText)
        if (data) callbacks.onCheck(data)
        return
      }
      case 'progress': {
        const data = parseJsonRecord<ProgressEvent>(dataText)
        if (data) {
          callbacks.onProgress({
            ...data,
            message: translateAutoImportEvent(data, t),
          })
        }
        return
      }
      case 'stderr': {
        const data = parseJsonRecord<StderrEvent>(dataText)
        if (data) callbacks.onStderr(data)
        return
      }
      case 'success': {
        const data = parseJsonRecord<SuccessEvent>(dataText)
        if (data) callbacks.onSuccess(data)
        return
      }
      case 'error': {
        const data = parseJsonRecord<ErrorEvent>(dataText)
        if (data) {
          callbacks.onError({
            message: translateAutoImportEvent(data, t),
          })
        } else {
          callbacks.onError({ message: t('autoImportModal.serverConnectionLost') })
        }
        return
      }
      case 'done':
        finish()
    }
  }

  const flushEvent = (type: string, dataLines: string[]) => {
    if (dataLines.length === 0) {
      return
    }

    const normalizedType = (type || 'message') as StreamEventType
    dispatchEvent(normalizedType, dataLines.join('\n'))
  }

  const processLines = (lines: string[], state: { currentEvent: string; dataLines: string[] }) => {
    for (const line of lines) {
      if (!line) {
        flushEvent(state.currentEvent, state.dataLines)
        state.currentEvent = ''
        state.dataLines = []
        continue
      }

      if (line.startsWith('event:')) {
        state.currentEvent = line.slice('event:'.length).trim()
        continue
      }

      if (line.startsWith('data:')) {
        state.dataLines.push(line.slice('data:'.length).trimStart())
      }
    }
  }

  const readStream = async () => {
    const response = await fetch('/api/auto-import/stream', {
      method: 'POST',
      signal: controller.signal,
    })

    if (!response.ok) {
      let message = t('autoImportModal.serverConnectionLost')

      try {
        const payload: unknown = await response.json()
        if (
          isPlainObject(payload) &&
          typeof payload['message'] === 'string' &&
          payload['message'].trim()
        ) {
          message = payload['message']
        }
      } catch {}

      callbacks.onError({ message })
      finish()
      return
    }

    if (!response.body) {
      callbacks.onError({ message: t('autoImportModal.serverConnectionLost') })
      finish()
      return
    }

    const reader = response.body.getReader()
    let buffer = ''
    const state = {
      currentEvent: '',
      dataLines: [] as string[],
    }

    while (true) {
      const { value, done: streamDone } = await reader.read()
      if (streamDone) {
        buffer += decoder.decode()
        if (buffer) {
          processLines(buffer.split(/\r?\n/), state)
          buffer = ''
        }
        flushEvent(state.currentEvent, state.dataLines)
        finish()
        return
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      processLines(lines, state)
    }
  }

  void readStream().catch((error) => {
    if (controller.signal.aborted) {
      finish()
      return
    }

    callbacks.onError({
      message:
        error instanceof Error && error.message
          ? error.message
          : t('autoImportModal.serverConnectionLost'),
    })
    finish()
  })

  return {
    close: () => {
      controller.abort()
      finish()
    },
  }
}
