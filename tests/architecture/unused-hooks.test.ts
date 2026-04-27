import {
  getImportedSourceFiles,
  getSourceFiles,
  isInSourceFolder,
  type SourceFile,
} from './source-graph'

const isHook = isInSourceFolder('src/hooks')
const frontendEntryPointPaths = ['src/main.tsx']

function isRuntimeSourceFile(file: SourceFile) {
  return !file.relativePath.endsWith('.d.ts')
}

function findReachableRuntimePaths({
  sourceFiles,
  getImports,
  entryPointPaths,
}: {
  sourceFiles: SourceFile[]
  getImports: (file: SourceFile) => SourceFile[]
  entryPointPaths: string[]
}) {
  const sourceFilesByPath = new Map(sourceFiles.map((file) => [file.relativePath, file]))
  const visitedPaths = new Set<string>()
  const pendingFiles = entryPointPaths
    .map((entryPointPath) => sourceFilesByPath.get(entryPointPath))
    .filter((file): file is SourceFile => Boolean(file))

  while (pendingFiles.length > 0) {
    const file = pendingFiles.pop()
    if (!file || visitedPaths.has(file.relativePath)) continue

    visitedPaths.add(file.relativePath)

    for (const importedFile of getImports(file)) {
      if (isRuntimeSourceFile(importedFile) && !visitedPaths.has(importedFile.relativePath)) {
        pendingFiles.push(importedFile)
      }
    }
  }

  return visitedPaths
}

function findUnusedHookPaths({
  sourceFiles,
  getImports,
  entryPointPaths = frontendEntryPointPaths,
}: {
  sourceFiles: SourceFile[]
  getImports: (file: SourceFile) => SourceFile[]
  entryPointPaths?: string[]
}) {
  const hookFiles = sourceFiles.filter(isHook).filter(isRuntimeSourceFile)
  const reachableRuntimePaths = findReachableRuntimePaths({
    sourceFiles: sourceFiles.filter(isRuntimeSourceFile),
    getImports,
    entryPointPaths,
  })

  return hookFiles
    .filter((file) => !reachableRuntimePaths.has(file.relativePath))
    .map((file) => file.relativePath)
    .sort()
}

function createSourceFile(relativePath: string): SourceFile {
  const name = relativePath.slice(relativePath.lastIndexOf('/') + 1)
  const extensionStart = name.lastIndexOf('.')

  return {
    absolutePath: `/repo/${relativePath}`,
    relativePath,
    name,
    extension: extensionStart >= 0 ? name.slice(extensionStart) : '',
  }
}

describe('unused hook guardrails', () => {
  it('keeps production hook files reachable from the app entrypoint', () => {
    const sourceFiles = getSourceFiles()

    const unusedHooks = findUnusedHookPaths({
      sourceFiles,
      getImports: getImportedSourceFiles,
    })

    expect(unusedHooks).toEqual([])
  })

  it('detects runtime hook files that are not reachable from the app entrypoint', () => {
    const entryPoint = createSourceFile('src/main.tsx')
    const app = createSourceFile('src/App.tsx')
    const dashboard = createSourceFile('src/components/Dashboard.tsx')
    const usedHook = createSourceFile('src/hooks/use-used-runtime.ts')
    const importedOnlyByDeadHook = createSourceFile('src/hooks/use-dead-child.ts')
    const unusedHook = createSourceFile('src/hooks/use-unused-runtime.ts')
    const declarationHook = createSourceFile('src/hooks/use-types.d.ts')

    const importsByPath = new Map<string, SourceFile[]>([
      [entryPoint.relativePath, [app]],
      [app.relativePath, [dashboard]],
      [dashboard.relativePath, [usedHook]],
      [unusedHook.relativePath, [importedOnlyByDeadHook]],
    ])

    const unusedHooks = findUnusedHookPaths({
      sourceFiles: [
        entryPoint,
        app,
        dashboard,
        usedHook,
        importedOnlyByDeadHook,
        unusedHook,
        declarationHook,
      ],
      getImports: (file) => importsByPath.get(file.relativePath) ?? [],
    })

    expect(unusedHooks).toEqual(['src/hooks/use-dead-child.ts', 'src/hooks/use-unused-runtime.ts'])
  })
})
