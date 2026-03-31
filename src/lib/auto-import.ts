export interface CheckEvent { tool: string; status: string; method?: string; version?: string }
export interface ProgressEvent { message: string }
export interface StderrEvent { line: string }
export interface SuccessEvent { days: number; totalCost: number }
export interface ErrorEvent { message: string }

export function startAutoImport(callbacks: {
  onCheck: (data: CheckEvent) => void
  onProgress: (data: ProgressEvent) => void
  onStderr: (data: StderrEvent) => void
  onSuccess: (data: SuccessEvent) => void
  onError: (data: ErrorEvent) => void
  onDone: () => void
}): { close: () => void } {
  const es = new EventSource('/api/auto-import/stream')

  es.addEventListener('check', (e) => {
    callbacks.onCheck(JSON.parse(e.data))
  })
  es.addEventListener('progress', (e) => {
    callbacks.onProgress(JSON.parse(e.data))
  })
  es.addEventListener('stderr', (e) => {
    callbacks.onStderr(JSON.parse(e.data))
  })
  es.addEventListener('success', (e) => {
    callbacks.onSuccess(JSON.parse(e.data))
  })
  es.addEventListener('error', (e) => {
    // SSE 'error' can be both our custom event and a connection error
    if (e instanceof MessageEvent && e.data) {
      callbacks.onError(JSON.parse(e.data))
    } else {
      callbacks.onError({ message: 'Verbindung zum Server verloren.' })
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
