import { describe, expect, it } from 'vitest'
import packageJson from '../../package.json'
import vitestConfig from '../../vitest.config'

type CoverageThresholds = {
  branches?: number
  functions?: number
  lines?: number
  statements?: number
}

type CoverageConfig = {
  exclude?: string[]
  include?: string[]
  thresholds?: CoverageThresholds
}

type ResolvedVitestConfig = {
  test?: {
    coverage?: CoverageConfig
  }
}

type VitestConfigFactory = (env: {
  command: 'serve'
  isPreview: false
  isSsrBuild: false
  mode: 'test'
}) => Promise<unknown> | unknown

async function resolveVitestConfig(): Promise<ResolvedVitestConfig> {
  if (typeof vitestConfig === 'function') {
    return (await (vitestConfig as VitestConfigFactory)({
      command: 'serve',
      mode: 'test',
      isSsrBuild: false,
      isPreview: false,
    })) as ResolvedVitestConfig
  }

  return vitestConfig as ResolvedVitestConfig
}

describe('vitest coverage configuration', () => {
  it('reports product runtime coverage instead of a narrow frontend slice', async () => {
    const config = await resolveVitestConfig()
    const coverage = config.test?.coverage

    expect(coverage?.include).toEqual([
      'src/**/*.{ts,tsx}',
      'server.js',
      'server/**/*.js',
      'shared/**/*.js',
      'usage-normalizer.js',
    ])
    expect(coverage?.exclude).toEqual(['src/**/*.d.ts', 'tests/**', 'shared/locales/**'])
    expect(coverage?.thresholds).toEqual({
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    })
  })

  it('keeps coverage-heavy scripts on bounded non-interactive reporters', () => {
    const coverageScripts = [
      packageJson.scripts['test:unit:coverage'],
      packageJson.scripts['test:timings'],
    ]

    for (const script of coverageScripts) {
      expect(script).toContain('--reporter=dot')
      expect(script).toContain('--reporter=junit')
      expect(script).toContain('--outputFile.junit=./test-results/vitest.junit.xml')
    }
  })
})
