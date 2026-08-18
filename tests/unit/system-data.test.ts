import fs, { promises as fsPromises } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createSystemDataRuntime, getSystemFilename, mergeUsageDatasets } =
  require('../../server/data-runtime/system-data.js') as {
    createSystemDataRuntime: (options: Record<string, unknown>) => {
      createEnvelope: (data: UsageData) => SystemEnvelope
      deleteAllImportedSystems: () => Promise<number>
      exportLocalData: (data: UsageData, targetPath?: string) => Promise<string>
      importSystem: (
        payload: SystemEnvelope,
        options?: { replace?: boolean },
      ) => Promise<{ replaced: boolean }>
      localHostname: string
      previewImport: (payload: SystemEnvelope) => { exists: boolean; filename: string }
      readImportedSystems: () => {
        systems: Array<{ hostname: string; data: UsageData }>
        unreadableFiles: Array<{ filename: string; message: string }>
      }
    }
    getSystemFilename: (hostname: string) => string
    mergeUsageDatasets: (datasets: UsageData[]) => UsageData
  }
const { version: packageVersion } = require('../../package.json') as { version: string }

interface UsageData {
  daily: Array<{
    date: string
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    thinkingTokens: number
    totalTokens: number
    totalCost: number
    requestCount: number
    modelsUsed: string[]
    modelBreakdowns: Array<{
      modelName: string
      inputTokens: number
      outputTokens: number
      cacheCreationTokens: number
      cacheReadTokens: number
      thinkingTokens: number
      cost: number
      requestCount: number
    }>
  }>
  totals: Record<string, number>
}

interface SystemEnvelope {
  kind: string
  version: number
  exportedAt: string
  appVersion: string
  hostname: string
  data: UsageData
}

function createUsage(cost = 1, date = '2026-08-18'): UsageData {
  const day = {
    date,
    inputTokens: 10,
    outputTokens: 5,
    cacheCreationTokens: 2,
    cacheReadTokens: 3,
    thinkingTokens: 1,
    totalTokens: 21,
    totalCost: cost,
    requestCount: 2,
    modelsUsed: ['gpt-5.6-sol'],
    modelBreakdowns: [
      {
        modelName: 'gpt-5.6-sol',
        inputTokens: 10,
        outputTokens: 5,
        cacheCreationTokens: 2,
        cacheReadTokens: 3,
        thinkingTokens: 1,
        cost,
        requestCount: 2,
      },
    ],
  }
  return {
    daily: [day],
    totals: {
      inputTokens: 10,
      outputTokens: 5,
      cacheCreationTokens: 2,
      cacheReadTokens: 3,
      thinkingTokens: 1,
      totalTokens: 21,
      totalCost: cost,
      requestCount: 2,
    },
  }
}

async function createRuntime(root: string) {
  const systemsDir = path.join(root, 'data', 'systems')
  const writeJsonAtomicAsync = async (filePath: string, value: unknown) => {
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true })
    await fsPromises.writeFile(filePath, JSON.stringify(value, null, 2))
  }
  return createSystemDataRuntime({
    fs,
    fsPromises,
    os: { hostname: () => 'Workstation-A', homedir: () => root },
    path,
    processObject: { cwd: () => root, env: {} },
    normalizeIncomingData: (value: unknown) => value,
    systemsDir,
    systemExportKind: 'ttdash-system-export',
    appVersion: packageVersion,
    writeJsonAtomicAsync,
    withFileMutationLock: async (_filePath: string, operation: () => Promise<unknown>) =>
      operation(),
  })
}

describe('system data persistence', () => {
  it('uses a stable hostname filename and exports to Downloads by default', async () => {
    const root = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-system-data-'))
    try {
      const runtime = await createRuntime(root)
      const filePath = await runtime.exportLocalData(createUsage())

      expect(runtime.localHostname).toBe('workstation-a')
      expect(filePath).toBe(path.join(root, 'Downloads', 'ttdash-system-workstation-a.json'))
      const envelope = JSON.parse(await fsPromises.readFile(filePath, 'utf8')) as SystemEnvelope
      expect(envelope).toMatchObject({
        kind: 'ttdash-system-export',
        version: 1,
        appVersion: packageVersion,
        hostname: 'workstation-a',
      })
      expect(path.basename(filePath)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
      expect(getSystemFilename('SERVER.Example')).toBe('ttdash-system-server.example.json')
    } finally {
      await fsPromises.rm(root, { recursive: true, force: true })
    }
  })

  it('previews collisions, requires replacement, and deletes imported systems', async () => {
    const root = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-system-data-'))
    try {
      const runtime = await createRuntime(root)
      const envelope = {
        ...runtime.createEnvelope(createUsage()),
        hostname: 'workstation-b',
      }

      expect(runtime.previewImport(envelope)).toEqual({
        hostname: 'workstation-b',
        filename: 'ttdash-system-workstation-b.json',
        exists: false,
      })
      await expect(runtime.importSystem(envelope)).resolves.toMatchObject({ replaced: false })
      expect(runtime.previewImport(envelope).exists).toBe(true)
      await expect(runtime.importSystem(envelope)).rejects.toMatchObject({ code: 'SYSTEM_EXISTS' })

      const replacement = { ...envelope, data: createUsage(4) }
      await expect(runtime.importSystem(replacement, { replace: true })).resolves.toMatchObject({
        replaced: true,
      })
      expect(runtime.readImportedSystems().systems[0]?.data.totals.totalCost).toBe(4)
      await expect(runtime.deleteAllImportedSystems()).resolves.toBe(1)
      expect(runtime.readImportedSystems()).toEqual({ systems: [], unreadableFiles: [] })
    } finally {
      await fsPromises.rm(root, { recursive: true, force: true })
    }
  })

  it('deletes corrupted system export files so reset can recover', async () => {
    const root = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-system-data-'))
    try {
      const runtime = await createRuntime(root)
      const systemsDir = path.join(root, 'data', 'systems')
      const corruptedFile = path.join(systemsDir, 'ttdash-system-corrupted.json')
      await fsPromises.mkdir(systemsDir, { recursive: true })
      await fsPromises.writeFile(corruptedFile, '{not-json')

      expect(runtime.readImportedSystems()).toEqual({
        systems: [],
        unreadableFiles: [
          {
            filename: 'ttdash-system-corrupted.json',
            message:
              'Imported system file ttdash-system-corrupted.json is unreadable or corrupted.',
          },
        ],
      })
      await expect(runtime.deleteAllImportedSystems()).resolves.toBe(1)
      await expect(fsPromises.stat(corruptedFile)).rejects.toMatchObject({ code: 'ENOENT' })
    } finally {
      await fsPromises.rm(root, { recursive: true, force: true })
    }
  })

  it('combines overlapping days and model breakdowns into one total', () => {
    const merged = mergeUsageDatasets([createUsage(1), createUsage(3)])

    expect(merged.daily).toHaveLength(1)
    expect(merged.daily[0]).toMatchObject({
      inputTokens: 20,
      totalTokens: 42,
      totalCost: 4,
      requestCount: 4,
    })
    expect(merged.daily[0]?.modelBreakdowns).toEqual([
      expect.objectContaining({ modelName: 'gpt-5.6-sol', cost: 4, requestCount: 4 }),
    ])
    expect(merged.totals).toMatchObject({ totalCost: 4, totalTokens: 42, requestCount: 4 })
  })

  it('rejects malformed normalized envelopes and tolerates missing breakdown arrays when merging', async () => {
    const root = await fsPromises.mkdtemp(path.join(tmpdir(), 'ttdash-system-data-'))
    try {
      const runtime = await createRuntime(root)
      expect(() =>
        runtime.previewImport({
          ...runtime.createEnvelope(createUsage()),
          hostname: 'workstation-b',
          data: null as unknown as UsageData,
        }),
      ).toThrow('Invalid system export file')

      const usage = createUsage()
      delete (usage.daily[0] as Partial<(typeof usage.daily)[number]>).modelBreakdowns
      expect(mergeUsageDatasets([usage]).daily[0]?.modelBreakdowns).toEqual([])
    } finally {
      await fsPromises.rm(root, { recursive: true, force: true })
    }
  })
})
