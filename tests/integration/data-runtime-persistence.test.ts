import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const fsPromises = fs.promises
const { createDataRuntime } = require('../../server/data-runtime.js') as {
  createDataRuntime: (options: Record<string, unknown>) => {
    ensureAppDirs: () => void
    paths: {
      dataFile: string
      settingsFile: string
    }
    readData: () => unknown
    readSettings: () => unknown
    readSettingsForWrite: () => { cliAutoLoadActive: boolean }
    writeSettings: (settings: unknown) => Promise<void>
  }
}

function createRuntime(runtimeRoot: string) {
  return createDataRuntime({
    fs,
    fsPromises,
    os: { homedir: () => runtimeRoot },
    path,
    processObject: {
      env: {
        TTDASH_CACHE_DIR: path.join(runtimeRoot, 'cache'),
        TTDASH_CONFIG_DIR: path.join(runtimeRoot, 'config'),
        TTDASH_DATA_DIR: path.join(runtimeRoot, 'data'),
      },
      kill: vi.fn(() => true),
      pid: process.pid,
      platform: 'linux',
    },
    normalizeIncomingData: (value: unknown) => value,
    runtimeInstanceId: 'data-runtime-persistence',
    appDirName: 'TTDash',
    appDirNameLinux: 'ttdash',
    legacyDataFile: path.join(runtimeRoot, 'legacy-data.json'),
    settingsBackupKind: 'ttdash-settings-backup',
    usageBackupKind: 'ttdash-usage-backup',
    isWindows: false,
    secureDirMode: 0o700,
    secureFileMode: 0o600,
    fileMutationLockTimeoutMs: 80,
    fileMutationLockStaleMs: 10,
  })
}

describe('data runtime persistence', () => {
  it('recovers default settings for writes while keeping corrupted persisted state visible', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-data-runtime-'))
    const runtime = createRuntime(runtimeRoot)

    try {
      runtime.ensureAppDirs()
      await fsPromises.writeFile(runtime.paths.settingsFile, '{broken settings')
      await fsPromises.writeFile(runtime.paths.dataFile, '{broken usage')

      expect(() => runtime.readSettings()).toThrow('Settings file is unreadable or corrupted.')
      expect(() => runtime.readData()).toThrow('Usage data file is unreadable or corrupted.')
      const recoveredSettings = runtime.readSettingsForWrite()
      expect(recoveredSettings).toMatchObject({ cliAutoLoadActive: false })

      await runtime.writeSettings(recoveredSettings)

      expect(runtime.readSettings()).toMatchObject({ cliAutoLoadActive: false })
    } finally {
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
  })
})
