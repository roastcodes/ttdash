import { afterEach, describe, expect, it, vi } from 'vitest'
import packageJson from '../../package.json'

type PlaywrightConfig = {
  fullyParallel?: boolean
  webServer?: unknown
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

  it('uses worker-scoped servers instead of the global Playwright web server', async () => {
    const localConfig = await importPlaywrightConfig(undefined)

    expect(localConfig).toMatchObject({
      fullyParallel: true,
      workers: undefined,
    })
    expect(localConfig.webServer).toBeUndefined()

    const ciConfig = await importPlaywrightConfig('true')

    expect(ciConfig).toMatchObject({
      fullyParallel: true,
      workers: 2,
    })
    expect(ciConfig.webServer).toBeUndefined()
    expect(packageJson.scripts['test:e2e:ci']).toBe('playwright test --workers=2')
    expect(packageJson.scripts['test:e2e:ci']).not.toContain('CI=1')
  })
})
