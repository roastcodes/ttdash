import { afterEach, describe, expect, it, vi } from 'vitest'
import packageJson from '../../package.json'

type PlaywrightConfig = {
  workers?: number
}

const originalCi = process.env.CI

async function importPlaywrightConfig(ci: string | undefined): Promise<PlaywrightConfig> {
  vi.resetModules()
  if (ci === undefined) {
    delete process.env.CI
  } else {
    process.env.CI = ci
  }

  const module = await import('../../playwright.config')
  return module.default as PlaywrightConfig
}

describe('playwright config', () => {
  afterEach(() => {
    if (originalCi === undefined) {
      delete process.env.CI
    } else {
      process.env.CI = originalCi
    }
  })

  it('keeps single-worker mode for CI only', async () => {
    await expect(importPlaywrightConfig(undefined)).resolves.toMatchObject({
      workers: undefined,
    })
    await expect(importPlaywrightConfig('true')).resolves.toMatchObject({
      workers: 1,
    })
    expect(packageJson.scripts['test:e2e:ci']).toContain('CI=1')
  })
})
