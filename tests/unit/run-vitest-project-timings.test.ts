import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)

type ProjectRun = {
  iteration: number
  project: string
  reportPath: string
}

type RunnerOptions = {
  dryRun: boolean
  maxSuiteSeconds: number
  maxTestSeconds: number
  projects: string[]
  repeat: number
  reportDir: string
}

type RunnerScript = {
  buildBudgetCommand: (
    run: ProjectRun,
    options: Pick<RunnerOptions, 'maxSuiteSeconds' | 'maxTestSeconds'>,
  ) => { command: string; args: string[] }
  buildProjectRuns: (
    options: Pick<RunnerOptions, 'projects' | 'repeat' | 'reportDir'>,
  ) => ProjectRun[]
  buildVitestCommand: (run: ProjectRun, platform?: string) => { command: string; args: string[] }
  getNpxCommand: (platform?: string) => string
  getReportPath: (project: string, iteration: number, repeat: number, reportDir: string) => string
  median: (values: number[]) => number
  parseArgs: (argv: string[]) => RunnerOptions
  run: (
    argv: string[],
    streams: {
      stdout: { write: (message: string) => void }
      stderr: { write: (message: string) => void }
    },
    spawnSyncImpl: (
      command: string,
      args: string[],
      options: unknown,
    ) => { error?: Error; status: number | null },
  ) => number
}

const timingRunner = require('../../scripts/run-vitest-project-timings.js') as RunnerScript

describe('Vitest project timing runner', () => {
  it('parses repeatable project timing options', () => {
    const options = timingRunner.parseArgs([
      '--projects=unit,frontend',
      '--repeat=3',
      '--report-dir=.cache/test-timings',
      '--max-suite-seconds=15',
      '--max-test-seconds=8',
    ])

    expect(options.projects).toEqual(['unit', 'frontend'])
    expect(options.repeat).toBe(3)
    expect(options.reportDir.replaceAll('\\', '/')).toMatch(/\.cache\/test-timings$/)
    expect(options.maxSuiteSeconds).toBe(15)
    expect(options.maxTestSeconds).toBe(8)
  })

  it('uses unique JUnit reports for each project and benchmark repeat', () => {
    const reportDir = path.resolve('test-results')
    const runs = timingRunner.buildProjectRuns({
      projects: ['unit', 'frontend'],
      repeat: 2,
      reportDir,
    })

    expect(runs).toEqual([
      {
        iteration: 1,
        project: 'unit',
        reportPath: path.join(reportDir, 'vitest-unit.timing-run-1.junit.xml'),
      },
      {
        iteration: 1,
        project: 'frontend',
        reportPath: path.join(reportDir, 'vitest-frontend.timing-run-1.junit.xml'),
      },
      {
        iteration: 2,
        project: 'unit',
        reportPath: path.join(reportDir, 'vitest-unit.timing-run-2.junit.xml'),
      },
      {
        iteration: 2,
        project: 'frontend',
        reportPath: path.join(reportDir, 'vitest-frontend.timing-run-2.junit.xml'),
      },
    ])

    expect(timingRunner.getReportPath('unit', 1, 1, reportDir)).toBe(
      path.join(reportDir, 'vitest-unit.timing.junit.xml'),
    )
  })

  it('builds Vitest and budget commands with isolated report paths', () => {
    const projectRun = {
      iteration: 1,
      project: 'frontend',
      reportPath: path.resolve('test-results/vitest-frontend.timing.junit.xml'),
    }

    expect(timingRunner.buildVitestCommand(projectRun)).toEqual({
      command: timingRunner.getNpxCommand(),
      args: [
        'vitest',
        'run',
        '--project',
        'frontend',
        '--reporter=dot',
        '--reporter=junit',
        `--outputFile.junit=${projectRun.reportPath}`,
      ],
    })
    expect(timingRunner.buildVitestCommand(projectRun, 'win32').command).toBe('npx.cmd')
    expect(timingRunner.buildVitestCommand(projectRun, 'linux').command).toBe('npx')

    const budgetCommand = timingRunner.buildBudgetCommand(projectRun, {
      maxSuiteSeconds: 20,
      maxTestSeconds: 12,
    })

    expect(budgetCommand.command).toBe(process.execPath)
    expect(budgetCommand.args).toContain(projectRun.reportPath)
    expect(budgetCommand.args).toContain('--max-suite-seconds=20')
    expect(budgetCommand.args).toContain('--max-test-seconds=12')
  })

  it('prints dry-run commands without spawning Vitest', () => {
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }
    const spawnSyncImpl = vi.fn(() => ({ status: 0 }))
    const mkdirSync = vi.spyOn(fs, 'mkdirSync')

    try {
      const status = timingRunner.run(
        ['--projects=unit', '--repeat=2', '--dry-run'],
        { stdout, stderr },
        spawnSyncImpl,
      )

      expect(status).toBe(0)
      expect(spawnSyncImpl).not.toHaveBeenCalled()
      expect(mkdirSync).not.toHaveBeenCalled()
      expect(stdout.write.mock.calls.join('\n')).toContain('vitest-unit.timing-run-1.junit.xml')
      expect(stdout.write.mock.calls.join('\n')).toContain('vitest-unit.timing-run-2.junit.xml')
    } finally {
      mkdirSync.mockRestore()
    }
  })

  it('fails explicitly when Vitest cannot be launched', () => {
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }
    const spawnSyncImpl = vi.fn(() => ({
      error: new Error('spawn npx ENOENT'),
      status: null,
    }))
    const mkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined)

    try {
      const status = timingRunner.run(['--projects=unit'], { stdout, stderr }, spawnSyncImpl)

      expect(status).toBe(1)
      expect(stderr.write).toHaveBeenCalledWith('Failed to launch vitest: spawn npx ENOENT\n')
    } finally {
      mkdirSync.mockRestore()
    }
  })

  it('fails explicitly when the timing budget check cannot be launched', () => {
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }
    const spawnSyncImpl = vi
      .fn()
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ error: new Error('spawn node ENOENT'), status: null })
    const mkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined)

    try {
      const status = timingRunner.run(['--projects=unit'], { stdout, stderr }, spawnSyncImpl)

      expect(status).toBe(1)
      expect(stderr.write).toHaveBeenCalledWith(
        'Failed to launch budget check: spawn node ENOENT\n',
      )
    } finally {
      mkdirSync.mockRestore()
    }
  })

  it('calculates median values for repeated timings', () => {
    expect(timingRunner.median([3000, 1000, 2000])).toBe(2000)
    expect(timingRunner.median([1000, 3000])).toBe(2000)
  })
})
