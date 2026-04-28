import { promises as fsPromises } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
// createDataRuntime expects the real Node fs surface; these contract tests avoid host writes.
const fs = require('node:fs')
const { createDataRuntime } = require('../../server/data-runtime.js') as {
  createDataRuntime: (options: Record<string, unknown>) => {
    appPaths: {
      dataDir: string
      configDir: string
      cacheDir: string
    }
    paths: {
      dataFile: string
      settingsFile: string
      npxCacheDir: string
    }
    ensureAppDirs: (extraDirs?: string[]) => void
    extractSettingsImportPayload: (payload: unknown) => unknown
    extractUsageImportPayload: (payload: unknown) => unknown
    isPersistedStateError: (error: unknown, kind?: string) => boolean
    mergeUsageData: (
      currentData: unknown,
      importedData: {
        daily: Array<Record<string, unknown>>
        totals: Record<string, number>
      },
    ) => {
      data: {
        daily: Array<Record<string, unknown>>
        totals: Record<string, number>
      }
      summary: {
        importedDays: number
        addedDays: number
        unchangedDays: number
        conflictingDays: number
        totalDays: number
      }
    }
    readData: () => unknown
    readSettings: () => { cliAutoLoadActive: boolean }
    readSettingsForWrite: () => { cliAutoLoadActive: boolean }
    writeData: (data: unknown) => Promise<void>
    writeSettings: (settings: unknown) => Promise<void>
  }
}

function createRuntime({
  env = {},
  getCliAutoLoadActive = () => false,
  homeDir = '/Users/tester',
  isWindows = false,
  pathModule = path,
  platform = 'darwin',
}: {
  env?: Record<string, string>
  getCliAutoLoadActive?: () => boolean
  homeDir?: string
  isWindows?: boolean
  pathModule?: typeof path
  platform?: string
} = {}) {
  return createDataRuntime({
    fs,
    fsPromises,
    os: { homedir: () => homeDir },
    path: pathModule,
    processObject: {
      env,
      kill: vi.fn(() => true),
      pid: 7319,
      platform,
    },
    normalizeIncomingData: (value: unknown) => value,
    runtimeInstanceId: 'data-runtime-contract',
    appDirName: 'TTDash',
    appDirNameLinux: 'ttdash',
    legacyDataFile: pathModule.join(homeDir, 'legacy-data.json'),
    settingsBackupKind: 'ttdash-settings-backup',
    usageBackupKind: 'ttdash-usage-backup',
    isWindows,
    secureDirMode: 0o700,
    secureFileMode: 0o600,
    fileMutationLockTimeoutMs: 80,
    fileMutationLockStaleMs: 10,
    getCliAutoLoadActive,
  })
}

describe('data runtime contracts', () => {
  it('prefers explicit data, config, and cache directories over platform defaults', () => {
    const runtime = createRuntime({
      env: {
        TTDASH_CACHE_DIR: '/tmp/ttdash/cache',
        TTDASH_CONFIG_DIR: '/tmp/ttdash/config',
        TTDASH_DATA_DIR: '/tmp/ttdash/data',
      },
      getCliAutoLoadActive: () => true,
      platform: 'linux',
    })

    expect(runtime.appPaths).toEqual({
      cacheDir: '/tmp/ttdash/cache',
      configDir: '/tmp/ttdash/config',
      dataDir: '/tmp/ttdash/data',
    })
    expect(runtime.paths).toMatchObject({
      dataFile: '/tmp/ttdash/data/data.json',
      settingsFile: '/tmp/ttdash/config/settings.json',
      npxCacheDir: '/tmp/ttdash/cache/npx-cache',
    })
    expect(runtime.readSettings()).toMatchObject({ cliAutoLoadActive: true })
  })

  it('resolves macOS, Windows, and XDG platform paths without touching the host profile', () => {
    const darwinRuntime = createRuntime({
      homeDir: '/Users/alex',
      platform: 'darwin',
    })
    const windowsRuntime = createRuntime({
      env: {
        APPDATA: 'C:\\Users\\Alex\\AppData\\Roaming',
        LOCALAPPDATA: 'C:\\Users\\Alex\\AppData\\Local',
      },
      homeDir: 'C:\\Users\\Alex',
      isWindows: true,
      pathModule: path.win32,
      platform: 'win32',
    })
    const linuxRuntime = createRuntime({
      env: {
        XDG_CACHE_HOME: '/home/alex/.cache-root',
        XDG_CONFIG_HOME: '/home/alex/.config-root',
        XDG_DATA_HOME: '/home/alex/.data-root',
      },
      homeDir: '/home/alex',
      platform: 'linux',
    })

    expect(darwinRuntime.appPaths).toEqual({
      dataDir: '/Users/alex/Library/Application Support/TTDash',
      configDir: '/Users/alex/Library/Application Support/TTDash',
      cacheDir: '/Users/alex/Library/Caches/TTDash',
    })
    expect(windowsRuntime.appPaths).toEqual({
      dataDir: 'C:\\Users\\Alex\\AppData\\Local\\TTDash',
      configDir: 'C:\\Users\\Alex\\AppData\\Roaming\\TTDash',
      cacheDir: 'C:\\Users\\Alex\\AppData\\Local\\TTDash\\Cache',
    })
    expect(linuxRuntime.appPaths).toEqual({
      dataDir: '/home/alex/.data-root/ttdash',
      configDir: '/home/alex/.config-root/ttdash',
      cacheDir: '/home/alex/.cache-root/ttdash',
    })
  })

  it('validates backup kinds before importing settings or usage payloads', () => {
    const runtime = createRuntime()

    expect(
      runtime.extractSettingsImportPayload({
        kind: 'ttdash-settings-backup',
        settings: { language: 'de' },
      }),
    ).toEqual({ language: 'de' })
    expect(
      runtime.extractUsageImportPayload({
        data: { daily: [] },
        kind: 'ttdash-usage-backup',
      }),
    ).toEqual({ daily: [] })
    expect(() =>
      runtime.extractSettingsImportPayload({ data: {}, kind: 'ttdash-usage-backup' }),
    ).toThrow('This is a data backup file, not a settings file.')
    expect(() =>
      runtime.extractUsageImportPayload({ kind: 'ttdash-settings-backup', settings: {} }),
    ).toThrow('This is a settings backup file, not a data file.')
  })

  it('merges imported usage data without overwriting conflicts or duplicating equivalent days', () => {
    const runtime = createRuntime()
    const currentDay = {
      date: '2026-04-01',
      inputTokens: 10,
      outputTokens: 5,
      cacheCreationTokens: 0,
      cacheReadTokens: 2,
      thinkingTokens: 1,
      totalTokens: 18,
      totalCost: 0.25,
      requestCount: 3,
      modelsUsed: ['GPT-5.4', 'Claude'],
      modelBreakdowns: [
        {
          modelName: 'Claude',
          inputTokens: 5,
          outputTokens: 3,
          cacheCreationTokens: 0,
          cacheReadTokens: 1,
          thinkingTokens: 0,
          cost: 0.1,
          requestCount: 1,
        },
        {
          modelName: 'GPT-5.4',
          inputTokens: 5,
          outputTokens: 2,
          cacheCreationTokens: 0,
          cacheReadTokens: 1,
          thinkingTokens: 1,
          cost: 0.15,
          requestCount: 2,
        },
      ],
    }
    const equivalentDay = {
      ...currentDay,
      modelsUsed: ['Claude', 'GPT-5.4'],
      modelBreakdowns: [...currentDay.modelBreakdowns].reverse(),
    }
    const conflictingDay = {
      ...currentDay,
      totalCost: 9,
    }
    const newDay = {
      ...currentDay,
      date: '2026-04-02',
      totalCost: 0.75,
      totalTokens: 20,
      requestCount: 4,
    }

    const equivalentMerge = runtime.mergeUsageData(
      { daily: [currentDay], totals: { totalCost: 0.25 } },
      {
        daily: [equivalentDay, newDay],
        totals: { totalCost: 1 },
      },
    )
    const conflictingMerge = runtime.mergeUsageData(
      { daily: [currentDay], totals: { totalCost: 0.25 } },
      {
        daily: [conflictingDay],
        totals: { totalCost: 9 },
      },
    )

    expect(equivalentMerge.summary).toEqual({
      importedDays: 2,
      addedDays: 1,
      unchangedDays: 1,
      conflictingDays: 0,
      totalDays: 2,
    })
    expect(equivalentMerge.data.daily.map((day) => day.date)).toEqual(['2026-04-01', '2026-04-02'])
    expect(equivalentMerge.data.totals).toMatchObject({
      totalCost: 1,
      totalTokens: 38,
      requestCount: 7,
    })
    expect(conflictingMerge.summary).toMatchObject({
      addedDays: 0,
      unchangedDays: 0,
      conflictingDays: 1,
      totalDays: 1,
    })
    expect(conflictingMerge.data.daily[0]?.totalCost).toBe(0.25)
  })
})
