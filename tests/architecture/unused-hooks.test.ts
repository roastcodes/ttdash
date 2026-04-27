import {
  getImportedSourceFiles,
  getSourceFiles,
  isInSourceFolder,
  type SourceFile,
} from './source-graph'

const isHook = isInSourceFolder('src/hooks')

function isRuntimeSourceFile(file: SourceFile) {
  return !file.relativePath.endsWith('.d.ts')
}

describe('unused hook guardrails', () => {
  it('keeps production hook files imported by production code', () => {
    const hookFiles = getSourceFiles().filter(isHook).filter(isRuntimeSourceFile)
    const productionFiles = getSourceFiles().filter(isRuntimeSourceFile)
    const importedProductionModules = new Set<string>()

    for (const file of productionFiles) {
      for (const importedFile of getImportedSourceFiles(file)) {
        importedProductionModules.add(importedFile.relativePath)
      }
    }

    const unusedHooks = hookFiles
      .filter((file) => !importedProductionModules.has(file.relativePath))
      .map((file) => file.relativePath)

    expect(unusedHooks).toEqual([])
  })
})
