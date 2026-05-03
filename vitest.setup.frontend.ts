import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { initI18n } from '@/lib/i18n'

// jsdom can expose different Event/CustomEvent constructors on globalThis and window.
// Radix dispatches globalThis.CustomEvent instances through DOM nodes, so align both.
function syncDomEventConstructors() {
  if (typeof window === 'undefined') {
    return
  }

  Object.defineProperty(globalThis, 'Event', {
    configurable: true,
    writable: true,
    value: window.Event,
  })
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    writable: true,
    value: window.CustomEvent,
  })
}

afterEach(() => {
  cleanup()
})

beforeAll(async () => {
  await initI18n('de')
  syncDomEventConstructors()

  if (typeof window === 'undefined') {
    return
  }

  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  }

  if (!window.ResizeObserver) {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserver,
    })
  }

  if (!window.IntersectionObserver) {
    class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: IntersectionObserver,
    })
  }
})

// Some tests intentionally reset globals, so restore the jsdom event constructors per test.
beforeEach(() => {
  syncDomEventConstructors()
})
