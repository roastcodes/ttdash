import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EventEmitter,
  FakeChildProcess,
  createSpawnSequence,
  resetServerHelperTestState,
  runCommandWithSpawn,
} from './server-helpers.shared'
import { createRuntimeWithSpawn } from './server-helpers-runner-test-utils'

afterEach(() => {
  resetServerHelperTestState()
})

describe('server helper utilities: command runner', () => {
  it('uses stdout as the toktrack command error message when stderr is empty', async () => {
    const spawnImpl = createSpawnSequence([{ code: 1, stdout: 'stdout failure\n' }])
    const runtime = createRuntimeWithSpawn(spawnImpl)

    await expect(
      runtime.runToktrack(
        {
          command: 'fake-runner',
          prefixArgs: ['--prefix'],
          env: { PATH: '/fake-bin' },
        },
        ['--version'],
      ),
    ).rejects.toMatchObject({
      message: 'stdout failure',
      stdout: 'stdout failure\n',
      stderr: '',
      exitCode: 1,
    })
    expect(spawnImpl).toHaveBeenCalledWith(
      'fake-runner',
      ['--prefix', '--version'],
      expect.objectContaining({
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { PATH: '/fake-bin' },
      }),
    )
  })

  it('streams stderr and lets callers terminate a running command on close', async () => {
    const child = new FakeChildProcess()
    const spawnImpl = vi.fn(() => child)
    const stderrLines: string[] = []
    let closeCommand: (() => void) | null = null

    const outcomePromise = runCommandWithSpawn('fake-runner', ['daily', '--json'], {
      streamStderr: true,
      onStderr: (line) => stderrLines.push(line),
      signalOnClose: (close) => {
        closeCommand = close
      },
      spawnImpl,
    })

    child.stderr.emit('data', Buffer.from('runner warning\n'))
    expect(stderrLines).toEqual(['runner warning\n'])

    closeCommand?.()

    await expect(outcomePromise).rejects.toMatchObject({
      message: 'runner warning',
      stderr: 'runner warning\n',
      exitCode: 143,
    })
  })

  it('rejects and terminates the command when a streamed stderr callback throws', async () => {
    const child = new FakeChildProcess()
    const spawnImpl = vi.fn(() => child)
    const callbackError = new Error('stderr listener failed')
    const onStderr = vi.fn(() => {
      throw callbackError
    })
    const outcomePromise = runCommandWithSpawn('fake-runner', ['daily', '--json'], {
      streamStderr: true,
      onStderr,
      spawnImpl,
    })

    child.stderr.emit('data', Buffer.from('runner warning\n'))
    child.stderr.emit('data', Buffer.from('ignored warning\n'))

    await expect(outcomePromise).rejects.toBe(callbackError)
    expect(onStderr).toHaveBeenCalledTimes(1)
    expect(child.exitCode).toBe(143)
  })

  it('rejects in-band when a streamed stderr callback throws during decoder flush', async () => {
    const child = new FakeChildProcess()
    const spawnImpl = vi.fn(() => child)
    const callbackError = new Error('stderr flush listener failed')
    const onStderr = vi.fn(() => {
      throw callbackError
    })
    const outcomePromise = runCommandWithSpawn('fake-runner', ['daily', '--json'], {
      streamStderr: true,
      onStderr,
      spawnImpl,
    })
    const symbol = Buffer.from('€')

    child.stderr.emit('data', symbol.subarray(0, 1))
    child.exitCode = 1
    child.emit('close', 1)

    await expect(outcomePromise).rejects.toBe(callbackError)
    expect(onStderr).toHaveBeenCalledWith('�')
  })

  it('captures stdout split across UTF-8 chunk boundaries', async () => {
    const child = new FakeChildProcess()
    const spawnImpl = vi.fn(() => child)
    const outcomePromise = runCommandWithSpawn('fake-runner', ['daily', '--json'], {
      spawnImpl,
    })
    const output = Buffer.from('a€b')

    child.stdout.emit('data', output.subarray(0, 2))
    child.stdout.emit('data', output.subarray(2))
    child.exitCode = 1
    child.emit('close', 1)

    await expect(outcomePromise).rejects.toMatchObject({
      message: 'a€b',
      stdout: 'a€b',
      exitCode: 1,
    })
  })

  it('streams stderr split across UTF-8 chunk boundaries without replacement characters', async () => {
    const child = new FakeChildProcess()
    const spawnImpl = vi.fn(() => child)
    const stderrLines: string[] = []
    const outcomePromise = runCommandWithSpawn('fake-runner', ['daily', '--json'], {
      streamStderr: true,
      onStderr: (line) => stderrLines.push(line),
      spawnImpl,
    })
    const prefix = Buffer.from('runner ')
    const symbol = Buffer.from('€')
    const suffix = Buffer.from(' warning\n')

    child.stderr.emit('data', Buffer.concat([prefix, symbol.subarray(0, 1)]))
    child.stderr.emit('data', Buffer.concat([symbol.subarray(1), suffix]))
    child.exitCode = 1
    child.emit('close', 1)

    await expect(outcomePromise).rejects.toMatchObject({
      message: 'runner € warning',
      stderr: 'runner € warning\n',
      exitCode: 1,
    })
    expect(stderrLines.join('')).toBe('runner € warning\n')
    expect(stderrLines.join('')).not.toContain('\uFFFD')
  })

  it('bounds captured output while preserving streamed stderr chunks', async () => {
    const spawnImpl = createSpawnSequence([
      {
        code: 1,
        stdout: 'abcdef',
        stderr: 'runner warning\n',
      },
    ])
    const stderrLines: string[] = []

    await expect(
      runCommandWithSpawn('fake-runner', ['daily', '--json'], {
        maxOutputBytes: 4,
        streamStderr: true,
        onStderr: (line) => stderrLines.push(line),
        spawnImpl,
      }),
    ).rejects.toMatchObject({
      stdout: 'abcd',
      stderr: 'runn',
      outputTruncated: true,
      exitCode: 1,
    })
    expect(stderrLines).toEqual(['runner warning\n'])
  })

  it('truncates captured UTF-8 output on character boundaries', async () => {
    const spawnImpl = createSpawnSequence([
      {
        code: 1,
        stdout: 'a€b',
      },
    ])

    await expect(
      runCommandWithSpawn('fake-runner', ['daily', '--json'], {
        maxOutputBytes: 3,
        spawnImpl,
      }),
    ).rejects.toMatchObject({
      stdout: 'a',
      outputTruncated: true,
      exitCode: 1,
    })
  })

  it('wraps spawn errors with command diagnostics', async () => {
    const child = new FakeChildProcess()
    const spawnImpl = vi.fn(() => child)
    const outcomePromise = runCommandWithSpawn('missing-runner', ['--version'], {
      spawnImpl,
    })

    child.emit('error', new Error('spawn denied'))

    await expect(outcomePromise).rejects.toMatchObject({
      message: 'spawn denied',
      command: 'missing-runner',
      args: ['--version'],
      stdout: '',
      stderr: '',
    })
  })

  it('waits for timed-out toktrack commands to exit before rejecting', async () => {
    vi.useFakeTimers()

    class FakeChild extends EventEmitter {
      stdout = new EventEmitter()
      stderr = new EventEmitter()
      exitCode: number | null = null

      kill(signal: string) {
        if (signal !== 'SIGTERM') {
          this.exitCode = 137
          this.emit('close', 137)
          return
        }

        setTimeout(() => {
          this.exitCode = 143
          this.emit('close', 143)
        }, 150)
      }
    }

    const child = new FakeChild()
    const spawnImpl = vi.fn(() => child) as unknown as ReturnType<typeof createSpawnSequence>
    const runtime = createRuntimeWithSpawn(spawnImpl)
    let settled = false

    try {
      const outcomePromise = runtime
        .runToktrack(
          {
            command: 'fake-runner',
            prefixArgs: [],
            env: {},
          },
          ['daily', '--json'],
          { timeoutMs: 50 },
        )
        .then((value) => ({ ok: true as const, value }))
        .catch((error) => ({ ok: false as const, error }))
        .finally(() => {
          settled = true
        })

      await vi.advanceTimersByTimeAsync(50)
      expect(settled).toBe(false)

      await vi.advanceTimersByTimeAsync(150)
      await expect(outcomePromise).resolves.toMatchObject({
        ok: false,
        error: {
          message: expect.stringContaining('Command timed out'),
          exitCode: 143,
          timedOut: true,
        },
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('uses a 5s process termination grace fallback when none is configured', async () => {
    vi.useFakeTimers()

    class FakeChild extends EventEmitter {
      stdout = new EventEmitter()
      stderr = new EventEmitter()
      exitCode: number | null = null
      signals: string[] = []

      kill(signal: string) {
        this.signals.push(signal)
        if (signal === 'SIGKILL') {
          this.exitCode = 137
          this.emit('close', 137)
        }
      }
    }

    const child = new FakeChild()
    const spawnImpl = vi.fn(() => child) as unknown as ReturnType<typeof createSpawnSequence>
    const runtime = createRuntimeWithSpawn(spawnImpl, {
      processTerminationGraceMs: undefined,
    })

    try {
      const outcomePromise = runtime
        .runToktrack(
          {
            command: 'fake-runner',
            prefixArgs: [],
            env: {},
          },
          ['daily', '--json'],
          { timeoutMs: 50 },
        )
        .then((value) => ({ ok: true as const, value }))
        .catch((error) => ({ ok: false as const, error }))

      await vi.advanceTimersByTimeAsync(50)
      expect(child.signals).toEqual(['SIGTERM'])

      await vi.advanceTimersByTimeAsync(4999)
      expect(child.signals).toEqual(['SIGTERM'])

      await vi.advanceTimersByTimeAsync(1)
      expect(child.signals).toEqual(['SIGTERM', 'SIGKILL'])
      await expect(outcomePromise).resolves.toMatchObject({
        ok: false,
        error: {
          message: expect.stringContaining('Command timed out'),
          exitCode: 137,
          timedOut: true,
        },
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
