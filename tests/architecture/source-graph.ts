import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

const repoRoot = process.cwd()
const sourceRoot = path.join(repoRoot, 'src')
const sourceExtensions = ['.ts', '.tsx']
const sourceExtensionSet = new Set(sourceExtensions)

export interface SourceFile {
  absolutePath: string
  relativePath: string
  name: string
  extension: string
}

interface SourceDependencyViolation {
  importer: SourceFile
  dependency: SourceFile
}

type SourceFilePredicate = (file: SourceFile) => boolean

let sourceFileCache: SourceFile[] | null = null
let sourceFileByAbsolutePathCache: Map<string, SourceFile> | null = null
let sourceImportsCache: Map<string, SourceFile[]> | null = null

function toRepoRelativePath(filePath: string) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function toDirectoryPrefix(folderPath: string) {
  return folderPath.replace(/\\/g, '/').replace(/\/$/, '')
}

function listSourceFilePaths(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      return listSourceFilePaths(fullPath)
    }

    if (!sourceExtensionSet.has(path.extname(fullPath))) return []
    return [fullPath]
  })
}

export function getSourceFiles() {
  if (sourceFileCache) return sourceFileCache

  sourceFileCache = listSourceFilePaths(sourceRoot)
    .sort()
    .map((absolutePath) => ({
      absolutePath,
      relativePath: toRepoRelativePath(absolutePath),
      name: path.basename(absolutePath),
      extension: path.extname(absolutePath),
    }))

  return sourceFileCache
}

function getSourceFileByAbsolutePath() {
  if (sourceFileByAbsolutePathCache) return sourceFileByAbsolutePathCache

  sourceFileByAbsolutePathCache = new Map(
    getSourceFiles().map((file) => [path.normalize(file.absolutePath), file]),
  )

  return sourceFileByAbsolutePathCache
}

export function collectSourceImportSpecifiers(filePath: string, source: string) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true)
  const specifiers: string[] = []

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text)
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length >= 1
    ) {
      const [specifier] = node.arguments

      if (specifier && ts.isStringLiteral(specifier)) {
        specifiers.push(specifier.text)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return specifiers
}

function collectImportSpecifiers(filePath: string) {
  return collectSourceImportSpecifiers(filePath, readFileSync(filePath, 'utf8'))
}

function candidateSourcePaths(basePath: string) {
  const extension = path.extname(basePath)
  const withoutJsExtension = basePath.replace(/\.(mjs|cjs|jsx?)$/, '')

  if (sourceExtensionSet.has(extension)) {
    return [basePath]
  }

  return [
    ...sourceExtensions.map((sourceExtension) => `${basePath}${sourceExtension}`),
    ...sourceExtensions.map((sourceExtension) => path.join(basePath, `index${sourceExtension}`)),
    ...sourceExtensions.map((sourceExtension) => `${withoutJsExtension}${sourceExtension}`),
    ...sourceExtensions.map((sourceExtension) =>
      path.join(withoutJsExtension, `index${sourceExtension}`),
    ),
  ]
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

function resolveSourceImport(importerPath: string, specifier: string) {
  const resolvedBasePath = resolveImportSpecifier(importerPath, specifier)
  if (!resolvedBasePath) return null

  const sourceFileByAbsolutePath = getSourceFileByAbsolutePath()

  for (const candidatePath of candidateSourcePaths(resolvedBasePath)) {
    const normalizedCandidatePath = path.normalize(candidatePath)

    if (existsSync(normalizedCandidatePath)) {
      const sourceFile = sourceFileByAbsolutePath.get(normalizedCandidatePath)
      if (sourceFile) return sourceFile
    }
  }

  return null
}

export function getImportedSourceFiles(file: SourceFile) {
  if (!sourceImportsCache) sourceImportsCache = new Map()

  const cachedImports = sourceImportsCache.get(file.absolutePath)
  if (cachedImports) return cachedImports

  const importsByPath = new Map<string, SourceFile>()

  for (const specifier of collectImportSpecifiers(file.absolutePath)) {
    const importedFile = resolveSourceImport(file.absolutePath, specifier)

    if (importedFile) {
      importsByPath.set(importedFile.relativePath, importedFile)
    }
  }

  const imports = [...importsByPath.values()].sort((first, second) =>
    first.relativePath.localeCompare(second.relativePath),
  )

  sourceImportsCache.set(file.absolutePath, imports)
  return imports
}

export function isInSourceFolder(folderPath: string): SourceFilePredicate {
  const folderPrefix = toDirectoryPrefix(folderPath)

  return (file) =>
    file.relativePath === folderPrefix || file.relativePath.startsWith(`${folderPrefix}/`)
}

export function hasRelativePath(matcher: RegExp): SourceFilePredicate {
  return (file) => matcher.test(file.relativePath)
}

export function findSourceDependencyViolations({
  from,
  to,
}: {
  from: SourceFilePredicate
  to: SourceFilePredicate
}) {
  const violations: SourceDependencyViolation[] = []

  for (const importer of getSourceFiles().filter(from)) {
    for (const dependency of getImportedSourceFiles(importer)) {
      if (to(dependency)) {
        violations.push({ importer, dependency })
      }
    }
  }

  return violations
    .sort((first, second) =>
      `${first.importer.relativePath}:${first.dependency.relativePath}`.localeCompare(
        `${second.importer.relativePath}:${second.dependency.relativePath}`,
      ),
    )
    .map(
      (violation) => `${violation.importer.relativePath} -> ${violation.dependency.relativePath}`,
    )
}
