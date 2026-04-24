import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

const sourceRoot = path.resolve(process.cwd(), 'src')
const hooksRoot = path.join(sourceRoot, 'hooks')
const sourceExtensions = new Set(['.ts', '.tsx'])
const ignoredSourceSuffixes = ['.d.ts']

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      return listSourceFiles(fullPath)
    }

    const extension = path.extname(fullPath)
    if (!sourceExtensions.has(extension)) return []
    if (ignoredSourceSuffixes.some((suffix) => fullPath.endsWith(suffix))) return []
    return [fullPath]
  })
}

function collectImportSpecifiers(filePath: string) {
  const source = readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true)
  const specifiers: string[] = []

  sourceFile.forEachChild((node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text)
    }
  })

  return specifiers
}

function resolveImportSpecifier(importerPath: string, specifier: string) {
  if (specifier.startsWith('@/')) {
    return path.join(sourceRoot, specifier.slice(2))
  }

  if (specifier.startsWith('.')) {
    return path.resolve(path.dirname(importerPath), specifier)
  }

  return null
}

function normalizePathWithoutExtension(filePath: string) {
  return filePath.replace(/\.(tsx?|jsx?)$/, '')
}

describe('unused hook guardrails', () => {
  it('keeps production hook files imported by production code', () => {
    const hookFiles = listSourceFiles(hooksRoot)
    const productionFiles = listSourceFiles(sourceRoot)
    const importedProductionModules = new Set<string>()

    for (const filePath of productionFiles) {
      for (const specifier of collectImportSpecifiers(filePath)) {
        const resolved = resolveImportSpecifier(filePath, specifier)
        if (resolved) {
          importedProductionModules.add(normalizePathWithoutExtension(resolved))
        }
      }
    }

    const unusedHooks = hookFiles
      .filter((filePath) => !importedProductionModules.has(normalizePathWithoutExtension(filePath)))
      .map((filePath) => path.relative(process.cwd(), filePath))

    expect(unusedHooks).toEqual([])
  })
})
