import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)

type TimingRow = {
  name: string
  suite?: string
  time: number
}

type TimingReport = {
  slowCases: TimingRow[]
  slowSuites: TimingRow[]
  suiteFailures: TimingRow[]
  suiteWarnings: TimingRow[]
  testFailures: TimingRow[]
  testWarnings: TimingRow[]
}

type TimingScript = {
  buildTimingReport: (
    junit: { cases: TimingRow[]; suites: TimingRow[] },
    options?: {
      maxSuiteSeconds?: number
      maxTestSeconds?: number
      warnSuiteSeconds?: number
      warnTestSeconds?: number
    },
  ) => TimingReport
  parseArgs: (argv: string[]) => {
    junitPath: string
    maxSuiteSeconds: number | null
    maxTestSeconds: number | null
    warnSuiteSeconds: number
    warnTestSeconds: number
  }
  parseJUnit: (xml: string) => { cases: TimingRow[]; suites: TimingRow[] }
}

const timingScript = require('../../scripts/report-test-timings.js') as TimingScript

describe('test timing report budgets', () => {
  it('parses Vitest JUnit suites and test cases', () => {
    const report = timingScript.parseJUnit(`
      <testsuites>
        <testsuite name="unit" time="1.25">
          <testcase classname="tests/unit/example.test.ts" name="fast path" time="0.04" />
          <testcase classname="tests/unit/example.test.ts" name="slow path" time="0.71" />
        </testsuite>
      </testsuites>
    `)

    expect(report.suites).toEqual([{ name: 'unit', time: 1.25 }])
    expect(report.cases).toEqual([
      { suite: 'tests/unit/example.test.ts', name: 'fast path', time: 0.04 },
      { suite: 'tests/unit/example.test.ts', name: 'slow path', time: 0.71 },
    ])
  })

  it('separates warning budgets from hard timing failures', () => {
    const report = timingScript.buildTimingReport(
      {
        suites: [
          { name: 'fast suite', time: 0.2 },
          { name: 'slow suite', time: 3 },
          { name: 'failed suite budget', time: 21 },
        ],
        cases: [
          { suite: 'a.test.ts', name: 'fast case', time: 0.1 },
          { suite: 'b.test.ts', name: 'slow case', time: 0.8 },
          { suite: 'c.test.ts', name: 'failed case budget', time: 12.5 },
        ],
      },
      {
        warnSuiteSeconds: 2,
        warnTestSeconds: 0.5,
        maxSuiteSeconds: 20,
        maxTestSeconds: 12,
      },
    )

    expect(report.suiteWarnings.map((suite) => suite.name)).toEqual([
      'failed suite budget',
      'slow suite',
    ])
    expect(report.testWarnings.map((testCase) => testCase.name)).toEqual([
      'failed case budget',
      'slow case',
    ])
    expect(report.suiteFailures.map((suite) => suite.name)).toEqual(['failed suite budget'])
    expect(report.testFailures.map((testCase) => testCase.name)).toEqual(['failed case budget'])
  })

  it('parses configurable timing budgets from CLI arguments', () => {
    const options = timingScript.parseArgs([
      './test-results/custom.junit.xml',
      '--warn-suite-seconds=1.5',
      '--warn-test-seconds=0.25',
      '--max-suite-seconds=20',
      '--max-test-seconds=12',
    ])

    expect(options.junitPath).toMatch(/test-results\/custom\.junit\.xml$/)
    expect(options.warnSuiteSeconds).toBe(1.5)
    expect(options.warnTestSeconds).toBe(0.25)
    expect(options.maxSuiteSeconds).toBe(20)
    expect(options.maxTestSeconds).toBe(12)
  })
})
