import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import * as ts from 'typescript'

const require = createRequire(import.meta.url)

interface SharedContractModule {
  declarationPath: string
  modulePath: string
}

const sharedContractModules: SharedContractModule[] = [
  {
    modulePath: 'shared/app-settings.js',
    declarationPath: 'shared/app-settings.d.ts',
  },
  {
    modulePath: 'shared/dashboard-preferences.js',
    declarationPath: 'shared/dashboard-preferences.d.ts',
  },
  {
    modulePath: 'shared/toktrack-version.js',
    declarationPath: 'shared/toktrack-version.d.ts',
  },
]

function hasExportModifier(node: ts.Node) {
  return ts.canHaveModifiers(node)
    ? Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
    : false
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(expression)
    ? unwrapExpression(expression.expression)
    : expression
}

function readExportAssignmentName(statement: ts.ExportAssignment) {
  const expression = unwrapExpression(statement.expression)

  if (ts.isIdentifier(expression)) {
    return expression.text
  }

  if (
    (ts.isClassExpression(expression) || ts.isFunctionExpression(expression)) &&
    expression.name
  ) {
    return expression.name.text
  }

  return null
}

function collectBindingIdentifierNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) {
    return [name.text]
  }

  return name.elements.flatMap((element) => {
    if (ts.isOmittedExpression(element)) {
      return []
    }

    return collectBindingIdentifierNames(element.name)
  })
}

function readDeclarationSourceFile(filePath: string) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
}

function resolveDeclarationModulePath(importerPath: string, moduleSpecifier: string) {
  if (!moduleSpecifier.startsWith('.')) {
    return null
  }

  const resolvedBasePath = path.resolve(path.dirname(importerPath), moduleSpecifier)
  const candidates = [
    resolvedBasePath,
    `${resolvedBasePath}.d.ts`,
    `${resolvedBasePath}.ts`,
    path.join(resolvedBasePath, 'index.d.ts'),
    path.join(resolvedBasePath, 'index.ts'),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function collectStarReExportValueExports(
  sourceFile: ts.SourceFile,
  statement: ts.ExportDeclaration,
  visitedFiles: Set<string>,
) {
  if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
    return []
  }

  const declarationPath = resolveDeclarationModulePath(
    sourceFile.fileName,
    statement.moduleSpecifier.text,
  )
  if (!declarationPath) {
    return []
  }

  return collectDeclarationValueExports(readDeclarationSourceFile(declarationPath), visitedFiles)
}

function collectDeclarationValueExports(
  sourceFile: ts.SourceFile,
  visitedFiles = new Set<string>(),
) {
  const sourcePath = path.resolve(sourceFile.fileName)
  if (visitedFiles.has(sourcePath)) {
    return []
  }
  visitedFiles.add(sourcePath)

  const exports = new Set<string>()

  for (const statement of sourceFile.statements) {
    if (
      hasExportModifier(statement) &&
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      exports.add(statement.name.text)
      continue
    }

    if (hasExportModifier(statement) && ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        for (const exportName of collectBindingIdentifierNames(declaration.name)) {
          exports.add(exportName)
        }
      }
      continue
    }

    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) {
        continue
      }

      if (!statement.exportClause) {
        for (const exportName of collectStarReExportValueExports(
          sourceFile,
          statement,
          visitedFiles,
        )) {
          exports.add(exportName)
        }
        continue
      }

      if (ts.isNamespaceExport(statement.exportClause)) {
        exports.add(statement.exportClause.name.text)
        continue
      }

      for (const element of statement.exportClause.elements) {
        if (!element.isTypeOnly) {
          exports.add(element.name.text)
        }
      }
    }

    if (ts.isExportAssignment(statement)) {
      const exportName = readExportAssignmentName(statement)
      if (exportName) {
        exports.add(exportName)
      }
    }
  }

  return [...exports].sort()
}

function readDeclarationValueExports(declarationPath: string) {
  const absolutePath = path.resolve(process.cwd(), declarationPath)
  return collectDeclarationValueExports(readDeclarationSourceFile(absolutePath))
}

function readRuntimeExports(modulePath: string) {
  const moduleExports = require(path.resolve(process.cwd(), modulePath)) as unknown

  if (moduleExports === null || moduleExports === undefined) {
    return []
  }

  if (typeof moduleExports === 'object') {
    return Object.keys(moduleExports).sort()
  }

  if (typeof moduleExports === 'function' && moduleExports.name) {
    return [moduleExports.name]
  }

  return ['default']
}

function createDeclarationFixture(source: string) {
  return ts.createSourceFile('fixture.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

describe('shared runtime declaration contracts', () => {
  it('collects named exports and assignment exports from declaration files', () => {
    expect(
      collectDeclarationValueExports(
        createDeclarationFixture(`
        export const namedConst: string
        export function namedFunction(): void
      `),
      ),
    ).toEqual(['namedConst', 'namedFunction'])

    expect(
      collectDeclarationValueExports(
        createDeclarationFixture(`
        declare const defaultContract: unknown
        export default defaultContract
      `),
      ),
    ).toEqual(['defaultContract'])

    expect(
      collectDeclarationValueExports(
        createDeclarationFixture(`
        declare const equalsContract: unknown
        export = equalsContract
      `),
      ),
    ).toEqual(['equalsContract'])
  })

  it('collects value exports from binding pattern declarations', () => {
    const sourceFile = createDeclarationFixture(`
      const valueSource = {}
      export const { objectValue, nested: { nestedValue } } = valueSource
      export const [firstArrayValue, , { deepArrayValue }] = valueSource
    `)

    expect(collectDeclarationValueExports(sourceFile)).toEqual([
      'deepArrayValue',
      'firstArrayValue',
      'nestedValue',
      'objectValue',
    ])
  })

  it('skips type-only re-export declarations', () => {
    const sourceFile = createDeclarationFixture(`
      const runtimeValue = 'runtime'
      interface TypeOnlyContract {}
      export { runtimeValue, type TypeOnlyContract }
      export type { TypeOnlyContract as RenamedTypeOnlyContract }
    `)

    expect(collectDeclarationValueExports(sourceFile)).toEqual(['runtimeValue'])
  })

  it('collects value exports from star re-export declarations', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-declaration-fixture-'))

    try {
      const reExportPath = path.join(fixtureRoot, 're-export.d.ts')
      writeFileSync(
        path.join(fixtureRoot, 'fixture-exports.d.ts'),
        `
          export const FIRST_VALUE: string
          export function secondValue(): void
          export interface IgnoredTypeOnlyContract {}
        `,
        'utf8',
      )

      const sourceFile = ts.createSourceFile(
        reExportPath,
        "export * from './fixture-exports'",
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      )

      expect(collectDeclarationValueExports(sourceFile)).toEqual(['FIRST_VALUE', 'secondValue'])
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it('reads named function default exports from CommonJS runtime modules', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'ttdash-runtime-fixture-'))

    try {
      const namedFunctionPath = path.join(fixtureRoot, 'named-function.cjs')
      const primitivePath = path.join(fixtureRoot, 'primitive.cjs')
      const emptyPath = path.join(fixtureRoot, 'empty.cjs')

      writeFileSync(namedFunctionPath, 'module.exports = function exportedRuntime() {}', 'utf8')
      writeFileSync(primitivePath, 'module.exports = 42', 'utf8')
      writeFileSync(emptyPath, 'module.exports = null', 'utf8')

      expect(readRuntimeExports(namedFunctionPath)).toEqual(['exportedRuntime'])
      expect(readRuntimeExports(primitivePath)).toEqual(['default'])
      expect(readRuntimeExports(emptyPath)).toEqual([])
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true })
    }
  })

  it.each(sharedContractModules)(
    'keeps $declarationPath value exports aligned with $modulePath',
    ({ declarationPath, modulePath }) => {
      expect(readDeclarationValueExports(declarationPath)).toEqual(readRuntimeExports(modulePath))
    },
  )
})
