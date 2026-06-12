import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createAutoImportMessages } = require('../../server/auto-import-runtime/messages.js') as {
  createAutoImportMessages: (options: { toktrackVersion: string }) => {
    formatAutoImportMessageEvent: (event: {
      key: string
      vars?: Record<string, string | number>
    }) => string
  }
}

describe('auto-import runtime messages', () => {
  it('preserves zero-second timeout and progress values', () => {
    const { formatAutoImportMessageEvent } = createAutoImportMessages({
      toktrackVersion: '1.0.0',
    })

    expect(formatAutoImportMessageEvent({ key: 'processingUsageData', vars: { seconds: 0 } })).toBe(
      'Processing usage data... (0s)',
    )
    expect(
      formatAutoImportMessageEvent({
        key: 'packageRunnerWarmupTimedOut',
        vars: { runner: 'npm exec', seconds: 0 },
      }),
    ).toContain('npm exec took longer than 0s')
    expect(
      formatAutoImportMessageEvent({
        key: 'toktrackExecutionTimedOut',
        vars: { runner: 'npm exec', seconds: 0 },
      }),
    ).toContain('within 0s via npm exec')
  })
})
