import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

const dashboardSectionsPath = path.resolve(
  process.cwd(),
  'src/components/dashboard/DashboardSections.tsx',
)
const dashboardViewModelPath = path.resolve(process.cwd(), 'src/types/dashboard-view-model.d.ts')

function readSourceFile(filePath: string) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
}

function findInterface(sourceFile: ts.SourceFile, name: string) {
  let declaration: ts.InterfaceDeclaration | null = null

  sourceFile.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === name) {
      declaration = node
    }
  })

  if (!declaration) {
    throw new Error(`Missing interface ${name}`)
  }

  return declaration
}

function findFunction(sourceFile: ts.SourceFile, name: string) {
  let declaration: ts.FunctionDeclaration | null = null

  sourceFile.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      declaration = node
    }
  })

  if (!declaration) {
    throw new Error(`Missing function ${name}`)
  }

  return declaration
}

function getIdentifierText(name: ts.PropertyName | ts.BindingName) {
  if (ts.isIdentifier(name)) return name.text
  throw new Error(`Expected identifier, received ${ts.SyntaxKind[name.kind]}`)
}

function getInterfaceProperties(sourceFile: ts.SourceFile, interfaceName: string) {
  return findInterface(sourceFile, interfaceName).members.map((member) => {
    if (!ts.isPropertySignature(member)) {
      throw new Error(`Expected property signature in ${interfaceName}`)
    }

    if (!member.type) {
      throw new Error(`Expected typed property in ${interfaceName}`)
    }

    return {
      name: getIdentifierText(member.name),
      type: member.type.getText(sourceFile),
    }
  })
}

describe('dashboard sections contract guardrails', () => {
  it('keeps DashboardSections behind one structured viewModel prop', () => {
    const sourceFile = readSourceFile(dashboardSectionsPath)
    const props = getInterfaceProperties(sourceFile, 'DashboardSectionsProps')
    const dashboardSections = findFunction(sourceFile, 'DashboardSections')
    const parameter = dashboardSections.parameters[0]

    expect(props).toEqual([{ name: 'viewModel', type: 'DashboardSectionsViewModel' }])
    expect(dashboardSections.parameters).toHaveLength(1)
    expect(parameter?.type?.getText(sourceFile)).toBe('DashboardSectionsProps')

    if (!parameter || !ts.isObjectBindingPattern(parameter.name)) {
      throw new Error('DashboardSections should destructure the viewModel prop')
    }

    expect(parameter.name.elements.map((element) => getIdentifierText(element.name))).toEqual([
      'viewModel',
    ])
  })

  it('keeps DashboardSectionsViewModel split into section bundles', () => {
    const sourceFile = readSourceFile(dashboardViewModelPath)

    expect(getInterfaceProperties(sourceFile, 'DashboardSectionsViewModel')).toEqual([
      { name: 'layout', type: 'DashboardSectionsLayoutViewModel' },
      { name: 'overview', type: 'DashboardOverviewSectionsViewModel' },
      { name: 'forecast', type: 'DashboardForecastSectionsViewModel' },
      { name: 'limits', type: 'DashboardLimitsSectionsViewModel' },
      { name: 'costAnalysis', type: 'DashboardCostAnalysisSectionsViewModel' },
      { name: 'tokenAnalysis', type: 'DashboardTokenAnalysisSectionsViewModel' },
      { name: 'requestAnalysis', type: 'DashboardRequestAnalysisSectionsViewModel' },
      { name: 'advancedAnalysis', type: 'DashboardAdvancedAnalysisSectionsViewModel' },
      { name: 'comparisons', type: 'DashboardComparisonSectionsViewModel' },
      { name: 'tables', type: 'DashboardTablesSectionsViewModel' },
      { name: 'interactions', type: 'DashboardSectionsInteractionsViewModel' },
    ])
  })
})
