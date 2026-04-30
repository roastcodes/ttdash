import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import packageJson from '../../package.json'

type PlaywrightConfig = {
  fullyParallel?: boolean
  reporter?: unknown
  testDir?: string
  timeout?: number
  use?: {
    screenshot?: string
    trace?: string
    video?: string
  }
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

async function readE2ESpecs() {
  const e2eDir = path.join(process.cwd(), 'tests', 'e2e')
  const filenames = (await readdir(e2eDir)).filter((filename) => filename.endsWith('.spec.ts'))

  return Promise.all(
    filenames.sort().map(async (filename) => ({
      filename,
      source: await readFile(path.join(e2eDir, filename), 'utf8'),
    })),
  )
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
      testDir: './tests/e2e',
      timeout: 30_000,
      use: {
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
        video: 'retain-on-failure',
      },
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
  }, 10_000)

  it('keeps Playwright reports in stable job-scoped output paths', async () => {
    const localConfig = await importPlaywrightConfig(undefined)

    expect(localConfig.reporter).toEqual([
      ['list'],
      ['html', { outputFolder: 'playwright-report', open: 'never' }],
      ['junit', { outputFile: 'test-results/playwright.junit.xml' }],
    ])
  })

  it('keeps browser specs on the shared worker-isolated fixture', async () => {
    const specs = await readE2ESpecs()

    expect(specs.map((spec) => spec.filename)).toEqual([
      'command-palette.spec.ts',
      'dashboard-forecast-filters.spec.ts',
      'dashboard-load-upload.spec.ts',
      'dashboard-reporting.spec.ts',
      'dashboard-settings-backups.spec.ts',
    ])

    for (const spec of specs) {
      expect(spec.source).toContain("from './fixtures'")
      expect(spec.source).not.toContain("from '@playwright/test'")
    }
  })

  it('keeps each browser spec isolated through the shared state-reset helpers', async () => {
    const specs = await readE2ESpecs()

    for (const spec of specs) {
      expect(
        spec.source.includes('resetAppState(') || spec.source.includes('prepareDashboard('),
        `${spec.filename} must reset or prepare isolated app state`,
      ).toBe(true)
    }
  })

  it('keeps Playwright as a representative smoke suite instead of a contract matrix', async () => {
    const specs = await readE2ESpecs()
    const totalTests = specs.reduce((count, spec) => {
      return count + (spec.source.match(/\btest\(/g) ?? []).length
    }, 0)

    expect(totalTests).toBe(11)
    expect(totalTests).toBeLessThanOrEqual(12)
    expect(packageJson.scripts['test:e2e:parallel']).toBe('npm run build:app && playwright test')
    expect(packageJson.scripts['test:e2e']).toBe('npm run test:e2e:parallel')
  })
})
