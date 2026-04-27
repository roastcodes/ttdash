import { fetchToktrackVersionStatus } from '@/lib/api'
import { TOKTRACK_VERSION } from '@/lib/toktrack-version'
import type { ToktrackVersionStatus } from '@/types'

/** Describes the session-wide toktrack version status snapshot used by the UI. */
export type ToktrackVersionStatusSnapshot = ToktrackVersionStatus & {
  isLoading: boolean
}

interface ScheduledWarmupHandle {
  cancel: () => void
}

interface IdleCallbackDeadline {
  didTimeout: boolean
  timeRemaining: () => number
}

type IdleCallback = (deadline: IdleCallbackDeadline) => void

interface IdleCallbackHost {
  requestIdleCallback?: (callback: IdleCallback, options?: { timeout?: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

const DEFAULT_TOKTRACK_VERSION_STATUS: ToktrackVersionStatusSnapshot = {
  configuredVersion: TOKTRACK_VERSION,
  latestVersion: null,
  isLatest: null,
  lookupStatus: 'ok',
  isLoading: true,
}

const listeners = new Set<() => void>()

let snapshot: ToktrackVersionStatusSnapshot = DEFAULT_TOKTRACK_VERSION_STATUS
let lookupPromise: Promise<ToktrackVersionStatus> | null = null
let hasSessionLookupSettled = false
let lookupGeneration = 0

function getIdleCallbackHost(): IdleCallbackHost {
  return typeof window === 'undefined' ? globalThis : window
}

function toSettledStatus(nextSnapshot: ToktrackVersionStatusSnapshot): ToktrackVersionStatus {
  return {
    configuredVersion: nextSnapshot.configuredVersion,
    latestVersion: nextSnapshot.latestVersion,
    isLatest: nextSnapshot.isLatest,
    lookupStatus: nextSnapshot.lookupStatus,
    ...(nextSnapshot.message ? { message: nextSnapshot.message } : {}),
  }
}

function normalizeToktrackVersionStatus(
  status: ToktrackVersionStatus,
): ToktrackVersionStatusSnapshot {
  return {
    ...status,
    configuredVersion: status.configuredVersion || TOKTRACK_VERSION,
    latestVersion: status.latestVersion ?? null,
    isLatest: typeof status.isLatest === 'boolean' ? status.isLatest : null,
    lookupStatus: status.lookupStatus === 'failed' ? 'failed' : 'ok',
    isLoading: false,
  }
}

function createFailedToktrackVersionStatus(error: unknown): ToktrackVersionStatusSnapshot {
  const message = error instanceof Error && error.message.trim() ? error.message.trim() : undefined

  return {
    configuredVersion: TOKTRACK_VERSION,
    latestVersion: null,
    isLatest: null,
    lookupStatus: 'failed',
    ...(message ? { message } : {}),
    isLoading: false,
  }
}

function publishToktrackVersionStatus(nextSnapshot: ToktrackVersionStatusSnapshot) {
  snapshot = nextSnapshot
  listeners.forEach((listener) => listener())
}

/** Returns the current session-wide toktrack version status snapshot. */
export function getToktrackVersionStatusSnapshot(): ToktrackVersionStatusSnapshot {
  return snapshot
}

/** Subscribes to session-wide toktrack version status changes. */
export function subscribeToktrackVersionStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Starts the toktrack latest-version lookup at most once per browser session. */
export function warmupToktrackVersionStatus(): Promise<ToktrackVersionStatus> {
  if (hasSessionLookupSettled) {
    return Promise.resolve(toSettledStatus(snapshot))
  }

  if (lookupPromise) {
    return lookupPromise
  }

  const generation = lookupGeneration
  publishToktrackVersionStatus({
    ...snapshot,
    isLoading: true,
  })

  lookupPromise = Promise.resolve()
    .then(fetchToktrackVersionStatus)
    .then((status) => {
      const nextSnapshot = normalizeToktrackVersionStatus(status)
      if (generation === lookupGeneration) {
        hasSessionLookupSettled = true
        publishToktrackVersionStatus(nextSnapshot)
      }
      return toSettledStatus(nextSnapshot)
    })
    .catch((error: unknown) => {
      const nextSnapshot = createFailedToktrackVersionStatus(error)
      if (generation === lookupGeneration) {
        hasSessionLookupSettled = true
        publishToktrackVersionStatus(nextSnapshot)
      }
      return toSettledStatus(nextSnapshot)
    })
    .finally(() => {
      if (generation === lookupGeneration) {
        lookupPromise = null
      }
    })

  return lookupPromise
}

/** Schedules the one-per-session toktrack latest-version warmup after initial UI work. */
export function scheduleToktrackVersionStatusWarmup(idleTimeoutMs = 2000): ScheduledWarmupHandle {
  let cancelled = false
  const runWarmup = () => {
    if (!cancelled) {
      void warmupToktrackVersionStatus()
    }
  }

  const host = getIdleCallbackHost()
  if (typeof host.requestIdleCallback === 'function') {
    const handle = host.requestIdleCallback(runWarmup, { timeout: idleTimeoutMs })
    return {
      cancel: () => {
        cancelled = true
        host.cancelIdleCallback?.(handle)
      },
    }
  }

  const handle = globalThis.setTimeout(runWarmup, 0)
  return {
    cancel: () => {
      cancelled = true
      globalThis.clearTimeout(handle)
    },
  }
}

/** Resets the in-memory toktrack version session cache for focused tests. */
export function resetToktrackVersionStatusSession() {
  lookupGeneration += 1
  lookupPromise = null
  hasSessionLookupSettled = false
  publishToktrackVersionStatus(DEFAULT_TOKTRACK_VERSION_STATUS)
}
