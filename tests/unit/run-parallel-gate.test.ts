import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)

type GateTask = {
  args: string[]
  command: string
  name: string
}

type ParallelGateScript = {
  createParallelGatePlan: (options?: { e2e?: boolean }) => GateTask[][]
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

  it('parses dry-run and e2e options', () => {
    expect(parallelGate.parseArgs(['--dry-run', '--e2e'])).toEqual({
      dryRun: true,
      e2e: true,
      help: false,
    })
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
    expect(stdout.write.mock.calls.join('\n')).toContain('e2e: npm run test:e2e:ci')
  })

  it('stops after the first failing group', async () => {
    const stdout = { write: vi.fn() }
    const stderr = { write: vi.fn() }
    const spawnImpl = vi.fn(() => {
      const child = new FakeChild()
      queueMicrotask(() => child.emit('close', 1))
      return child
    })

    const status = await parallelGate.run([], { stdout, stderr }, spawnImpl)

    expect(status).toBe(1)
    expect(spawnImpl).toHaveBeenCalledTimes(3)
  })
})
