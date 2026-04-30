import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  TOKTRACK_VERSION,
  commandExists,
  fsPromises,
  getExecutableName,
  lookupLatestToktrackVersion,
  path,
  resetServerHelperTestState,
  resolveToktrackRunner,
  runToktrack,
  tmpdir,
  writeExecutableScript,
} from './server-helpers.shared'

afterEach(() => {
  resetServerHelperTestState()
})

describe('server helper utilities: toktrack runner process integration', () => {
  it('prefers the pinned local toktrack installation when available', async () => {
    const runner = await resolveToktrackRunner()

    expect(runner).not.toBeNull()
    expect(runner?.method).toBe('local')

    const versionOutput = await runToktrack(runner!, ['--version'])
    expect(versionOutput).toContain(TOKTRACK_VERSION)
  })

  it('returns a structured warning when the latest toktrack version lookup fails', async () => {
    const originalPath = process.env.PATH
    process.env.PATH = ''

    try {
      const status = await lookupLatestToktrackVersion()
      expect(status).toMatchObject({
        configuredVersion: TOKTRACK_VERSION,
        latestVersion: null,
        isLatest: null,
        lookupStatus: 'failed',
      })
    } finally {
      process.env.PATH = originalPath
    }
  })

  it.runIf(process.platform !== 'win32')(
    'falls back to npx when bunx exists but cannot execute toktrack',
    async () => {
      const tempDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-runner-fallback-'))
      const originalPath = process.env.PATH
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      process.env.PATH = tempDir

      try {
        await writeExecutableScript(tempDir, 'bun', 'exit 0')
        await writeExecutableScript(tempDir, 'bunx', 'echo "bunx failed" >&2\nexit 1')
        await writeExecutableScript(tempDir, 'npx', `echo "toktrack ${TOKTRACK_VERSION}"\nexit 0`)

        const runner = await resolveToktrackRunner()

        expect(runner).not.toBeNull()
        expect(runner?.method).toBe('npm')
        expect(runner?.command).toBe('npx')
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to probe bunx'))
      } finally {
        warnSpy.mockRestore()
        process.env.PATH = originalPath
        await fsPromises.rm(tempDir, { recursive: true, force: true })
      }
    },
  )

  it.runIf(process.platform !== 'win32')(
    'times out hung toktrack commands instead of waiting indefinitely',
    async () => {
      const tempDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-runner-timeout-'))
      const originalPath = process.env.PATH
      const nodePath = JSON.stringify(process.execPath)
      process.env.PATH = tempDir

      try {
        const slowRunnerPath = await writeExecutableScript(
          tempDir,
          'slowtoktrack',
          `exec ${nodePath} -e "setTimeout(() => {}, 1000)"`,
        )

        await expect(
          runToktrack(
            {
              command: slowRunnerPath,
              prefixArgs: [],
              env: process.env,
            },
            ['daily', '--json'],
            { timeoutMs: 50 },
          ),
        ).rejects.toMatchObject({
          message: expect.stringContaining('Command timed out'),
          timedOut: true,
        })
      } finally {
        process.env.PATH = originalPath
        await fsPromises.rm(tempDir, { recursive: true, force: true })
      }
    },
  )

  it.runIf(process.platform !== 'win32')(
    'surfaces stdout text when a runner exits with an error and empty stderr',
    async () => {
      const tempDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-runner-stdout-fail-'))

      try {
        const failingRunnerPath = await writeExecutableScript(
          tempDir,
          'stdoutfail',
          'echo "stdout failure"\nexit 1',
        )

        await expect(
          runToktrack(
            {
              command: failingRunnerPath,
              prefixArgs: [],
              env: process.env,
            },
            ['--version'],
          ),
        ).rejects.toThrow('stdout failure')
      } finally {
        await fsPromises.rm(tempDir, { recursive: true, force: true })
      }
    },
  )

  it.runIf(process.platform === 'win32')(
    'checks npx on Windows without emitting DEP0190 warnings',
    async () => {
      const warningMessages: string[] = []
      const emitWarning = vi.spyOn(process, 'emitWarning').mockImplementation(((
        warning: string | Error,
      ) => {
        warningMessages.push(typeof warning === 'string' ? warning : warning.message)
        return process
      }) as typeof process.emitWarning)

      expect(await commandExists(getExecutableName('npx'))).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(emitWarning).not.toHaveBeenCalledWith(
        expect.stringContaining('DEP0190'),
        expect.anything(),
        expect.anything(),
      )
      expect(warningMessages.join('\n')).not.toContain('DEP0190')
    },
  )
})
