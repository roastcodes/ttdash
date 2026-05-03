import { promises as fsPromises } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
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
        skippedDays: number
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
  it('prefers explicit data, config, and cache directories over platform defaults', async () => {
    const runtimeRoot = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-runtime-contract-'))
    const cacheDir = path.join(runtimeRoot, 'cache')
    const configDir = path.join(runtimeRoot, 'config')
    const dataDir = path.join(runtimeRoot, 'data')

    try {
      const runtime = createRuntime({
        env: {
          TTDASH_CACHE_DIR: cacheDir,
          TTDASH_CONFIG_DIR: configDir,
          TTDASH_DATA_DIR: dataDir,
        },
        getCliAutoLoadActive: () => true,
        platform: 'linux',
      })

      expect(runtime.appPaths).toEqual({
        cacheDir,
        configDir,
        dataDir,
      })
      expect(runtime.paths).toMatchObject({
        dataFile: path.join(dataDir, 'data.json'),
        settingsFile: path.join(configDir, 'settings.json'),
        npxCacheDir: path.join(cacheDir, 'npx-cache'),
      })
      expect(runtime.readSettings()).toMatchObject({ cliAutoLoadActive: true })
    } finally {
      await fsPromises.rm(runtimeRoot, { recursive: true, force: true })
    }
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
      totalCost: 0.1 + 0.2 - 0.05,
      modelsUsed: ['Claude', 'GPT-5.4'],
      modelBreakdowns: [
        {
          ...currentDay.modelBreakdowns[1],
          cost: 0.15 + Number.EPSILON,
        },
        {
          ...currentDay.modelBreakdowns[0],
          cost: 0.1 + Number.EPSILON,
        },
      ],
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
      skippedDays: 0,
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
      skippedDays: 0,
      totalDays: 1,
    })
    expect(conflictingMerge.data.daily[0]?.totalCost).toBe(0.25)
  })

  it('skips imported usage days without a usable date before writing merged data', () => {
    const runtime = createRuntime()
    const validDay = {
      date: '2026-04-03',
      inputTokens: 1,
      outputTokens: 2,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      thinkingTokens: 0,
      totalTokens: 3,
      totalCost: 0.1,
      requestCount: 1,
      modelsUsed: ['GPT-5.4'],
      modelBreakdowns: [],
    }

    const merge = runtime.mergeUsageData(null, {
      daily: [{ ...validDay, date: '' }, validDay],
      totals: { totalCost: 9 },
    })

    expect(merge.summary).toMatchObject({
      importedDays: 2,
      addedDays: 1,
      skippedDays: 1,
      totalDays: 1,
    })
    expect(merge.data.daily.map((day) => day.date)).toEqual(['2026-04-03'])
    expect(merge.data.totals).toMatchObject({ totalCost: 0.1, totalTokens: 3 })
  })

  it('recomputes imported totals with numeric coercion when no current usage exists', () => {
    const runtime = createRuntime()

    const merge = runtime.mergeUsageData(null, {
      daily: [
        {
          date: '2026-04-03',
          inputTokens: '5',
          outputTokens: '7',
          cacheCreationTokens: '2',
          cacheReadTokens: '3',
          thinkingTokens: '4',
          totalTokens: '21',
          totalCost: '1.5',
          requestCount: '6',
          modelsUsed: ['GPT-5.4'],
          modelBreakdowns: [],
        },
      ],
      totals: { totalCost: 999, totalTokens: 999, requestCount: 999 },
    })

    expect(merge.summary).toMatchObject({
      importedDays: 1,
      addedDays: 1,
      skippedDays: 0,
      totalDays: 1,
    })
    expect(merge.data.daily[0]).toMatchObject({
      inputTokens: 5,
      outputTokens: 7,
      cacheCreationTokens: 2,
      cacheReadTokens: 3,
      thinkingTokens: 4,
      totalTokens: 21,
      totalCost: 1.5,
      requestCount: 6,
    })
    expect(merge.data.totals).toEqual({
      inputTokens: 5,
      outputTokens: 7,
      cacheCreationTokens: 2,
      cacheReadTokens: 3,
      thinkingTokens: 4,
      totalCost: 1.5,
      totalTokens: 21,
      requestCount: 6,
    })
  })

  it('rejects usage imports that do not contain a daily array before merging', () => {
    const runtime = createRuntime()

    expect(() => runtime.mergeUsageData(null, { totals: {} } as never)).toThrow(
      'Imported data must contain a daily array.',
    )
  })
})
