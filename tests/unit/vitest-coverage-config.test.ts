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
    projects?: Array<{
      test?: {
        environment?: string
        name?: string
        setupFiles?: string[]
      }
    }>
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
    const coverageScript = packageJson.scripts['test:unit:coverage']
    const timingsScript = packageJson.scripts['test:timings']
    const coverageScripts = [coverageScript, timingsScript]

    for (const script of coverageScripts) {
      expect(script).toContain('--reporter=dot')
      expect(script).toContain('--reporter=junit')
    }

    expect(coverageScript).toContain('--outputFile.junit=./test-results/vitest-coverage.junit.xml')
    expect(timingsScript).toContain('--outputFile.junit=./test-results/vitest-timings.junit.xml')
    expect(timingsScript).toContain(
      'node scripts/report-test-timings.js ./test-results/vitest-timings.junit.xml',
    )
  })

  it('keeps React Testing Library setup out of Node-only projects', async () => {
    const config = await resolveVitestConfig()
    const projects = config.test?.projects ?? []
    const expectedSetupByProject = new Map([
      ['architecture', ['./vitest.setup.node.ts']],
      ['unit', ['./vitest.setup.node.ts']],
      ['frontend', ['./vitest.setup.node.ts', './vitest.setup.frontend.ts']],
      ['integration', ['./vitest.setup.node.ts']],
      ['integration-background', ['./vitest.setup.node.ts']],
    ])

    expect(projects).toHaveLength(expectedSetupByProject.size)

    for (const project of projects) {
      const name = project.test?.name
      expect(name).toBeDefined()
      expect(expectedSetupByProject.has(name ?? '')).toBe(true)
      expect(project.test?.setupFiles).toEqual(expectedSetupByProject.get(name ?? ''))
    }
  })
})
