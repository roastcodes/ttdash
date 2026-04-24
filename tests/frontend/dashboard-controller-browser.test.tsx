// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DashboardTestHooks } from '@/hooks/use-dashboard-controller-types'
import {
  downloadJsonFile,
  registerDashboardOpenSettingsHandler,
  scrollToSection,
} from '@/hooks/use-dashboard-controller-browser'

function setDashboardTestHooks(hooks: DashboardTestHooks | undefined) {
  ;(
    window as Window & {
      __TTDASH_TEST_HOOKS__?: DashboardTestHooks
    }
  ).__TTDASH_TEST_HOOKS__ = hooks
}

describe('dashboard controller browser helpers', () => {
  afterEach(() => {
    setDashboardTestHooks(undefined)
    vi.restoreAllMocks()
  })

  it('emits JSON downloads through the dashboard test hook bridge and browser anchor flow', () => {
    const downloads: Array<{ filename: string; text: string }> = []
    const anchor = document.createElement('a')
    anchor.click = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        return anchor
      }
      return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:json-download')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    setDashboardTestHooks({
      onJsonDownload: (record) => downloads.push(record),
    })

    downloadJsonFile('backup.json', { kind: 'backup', ok: true })

    expect(downloads).toEqual([
      expect.objectContaining({
        filename: 'backup.json',
        text: expect.stringContaining('"kind": "backup"'),
      }),
    ])
    expect(anchor.click).toHaveBeenCalledTimes(1)
  })

  it('registers and only cleans up the matching open-settings bridge handler', () => {
    const handler = vi.fn()
    setDashboardTestHooks({})

    const cleanup = registerDashboardOpenSettingsHandler(handler)

    expect(
      (
        window as Window & {
          __TTDASH_TEST_HOOKS__?: DashboardTestHooks
        }
      ).__TTDASH_TEST_HOOKS__?.openSettings,
    ).toBe(handler)

    const otherHandler = vi.fn()
    setDashboardTestHooks({ openSettings: otherHandler })
    cleanup()

    expect(
      (
        window as Window & {
          __TTDASH_TEST_HOOKS__?: DashboardTestHooks
        }
      ).__TTDASH_TEST_HOOKS__?.openSettings,
    ).toBe(otherHandler)
  })

  it('scrolls to a section when the target exists and stays inert when it does not', () => {
    const section = document.createElement('section')
    section.id = 'forecast-cache'
    section.scrollIntoView = vi.fn()
    document.body.appendChild(section)

    scrollToSection('forecast-cache')
    scrollToSection('missing-section')

    expect(section.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })
})
