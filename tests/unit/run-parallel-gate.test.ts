import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)

type GateTask = {
  args: string[]
  command: string
  name: string
  outputPaths: string[]
}

type ParallelGateScript = {
  createParallelGatePlan: (options?: { e2e?: boolean }) => GateTask[][]
  findParallelOutputCollisions: (
    plan: GateTask[][],
  ) => { group: number; outputPath: string; tasks: string[] }[]
  parseArgs: (argv: string[]) => { dryRun: boolean; e2e: boolean; help: boolean }
  run: (
    argv: string[],
    streams: {
      stdout: { write: (message: string) => void }
      stderr: { write: (message: string) => void }
    },
    spawnImpl: (command: string, args: string[], options: unknown) => EventEmitter,
  ) => Promise<number>
}

class FakeChild extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
}

const parallelGate = require('../../scripts/run-parallel-gate.js') as ParallelGateScript

describe('parallel verification gate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps independent work parallel and isolates high-contention test suites', () => {
    const plan = parallelGate.createParallelGatePlan({ e2e: true })

    expect(plan.map((group) => group.map((task) => task.name))).toEqual([
      ['static', 'integration', 'build'],
      ['unit'],
      ['frontend'],
      ['architecture'],
      ['integration-background'],
      ['package-smoke', 'e2e'],
    ])
    expect(plan[2]?.find((task) => task.name === 'frontend')?.args).toEqual([
      'run',
      'test:vitest:frontend',
    ])
    expect(plan[5]?.find((task) => task.name === 'e2e')?.args).toEqual(['run', 'test:e2e:ci'])
  })

  it('declares output paths without collisions inside parallel groups', () => {
    const plan = parallelGate.createParallelGatePlan({ e2e: true })

    expect(parallelGate.findParallelOutputCollisions(plan)).toEqual([])
    expect(plan[0]?.find((task) => task.name === 'integration')?.outputPaths).toEqual([
      'test-results/vitest-integration.junit.xml',
    ])
    expect(plan[1]?.find((task) => task.name === 'unit')?.outputPaths).toEqual([
      'test-results/vitest-unit.junit.xml',
    ])
    expect(plan[2]?.find((task) => task.name === 'frontend')?.outputPaths).toEqual([
      'test-results/vitest-frontend.junit.xml',
    ])
    expect(plan[5]?.find((task) => task.name === 'e2e')?.outputPaths).toEqual([
      'playwright-report/',
      'test-results/',
    ])
  })

  it('detects duplicate report outputs within a parallel group', () => {
    const duplicatePlan = [
      [
        {
          args: ['run', 'left'],
          command: 'npm',
          name: 'left',
          outputPaths: ['test-results/shared.junit.xml'],
        },
        {
          args: ['run', 'right'],
          command: 'npm',
          name: 'right',
          outputPaths: ['test-results/shared.junit.xml'],
        },
      ],
    ]

    expect(parallelGate.findParallelOutputCollisions(duplicatePlan)).toEqual([
      {
        group: 1,
        outputPath: 'test-results/shared.junit.xml',
        tasks: ['left', 'right'],
      },
    ])
  })

  it('parses dry-run and e2e options', () => {
    expect(parallelGate.parseArgs(['--dry-run', '--e2e'])).toEqual({
      dryRun: true,
      e2e: true,
      help: false,
    })
  })

  it('rejects unknown options before spawning any gate tasks', async () => {
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }
    const spawnImpl = vi.fn()

    const status = await parallelGate.run(['--unknown'], { stdout, stderr }, spawnImpl)

    expect(status).toBe(1)
    expect(spawnImpl).not.toHaveBeenCalled()
    expect(stderr.write).toHaveBeenCalledWith('Unknown option: --unknown\n')
  })

  it('prints the task graph without spawning commands in dry-run mode', async () => {
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }
    const spawnImpl = vi.fn()

    const status = await parallelGate.run(['--dry-run', '--e2e'], { stdout, stderr }, spawnImpl)

    expect(status).toBe(0)
    expect(spawnImpl).not.toHaveBeenCalled()
    expect(stdout.write.mock.calls.join('\n')).toContain('group 1')
    expect(stdout.write.mock.calls.join('\n')).toContain('frontend: npm run test:vitest:frontend')
    expect(stdout.write.mock.calls.join('\n')).toContain(
      'outputs: test-results/vitest-frontend.junit.xml',
    )
    expect(stdout.write.mock.calls.join('\n')).toContain('e2e: npm run test:e2e:ci')
  })

  it('stops after the first failing group', async () => {
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }
    const expectedFirstGroupSize = parallelGate.createParallelGatePlan({ e2e: false })[0].length
    const spawnImpl = vi.fn(() => {
      const child = new FakeChild()
      queueMicrotask(() => child.emit('close', 1))
      return child
    })

    const status = await parallelGate.run([], { stdout, stderr }, spawnImpl)

    expect(status).toBe(1)
    expect(spawnImpl).toHaveBeenCalledTimes(expectedFirstGroupSize)
  })

  it('prints task durations and a timing summary', async () => {
    let now = 1_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }
    const spawnImpl = vi.fn(() => {
      const child = new FakeChild()
      queueMicrotask(() => {
        now += 1_250
        child.emit('close', 0)
      })
      return child
    })

    const status = await parallelGate.run([], { stdout, stderr }, spawnImpl)
    const output = stdout.write.mock.calls.join('\n')

    expect(status).toBe(0)
    expect(output).toContain('[static] exited with 0 after 1.25s')
    expect(output).toContain('parallel gate timing summary')
    expect(output).toContain('static: status=0 duration=1.25s')
    expect(output).toContain('package-smoke: status=0 duration=1.25s')
  })
})
