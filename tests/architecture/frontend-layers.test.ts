import {
  findSourceDependencyViolations,
  hasRelativePath,
  isInSourceFolder,
  type SourceFile,
} from './source-graph'

const isHook = isInSourceFolder('src/hooks')
const isComponent = isInSourceFolder('src/components')
const isTypeModule = isInSourceFolder('src/types')
const isLibCore = hasRelativePath(/^src\/lib\/.+\.ts$/)
const isLibReactModule = hasRelativePath(/^src\/lib\/.+\.tsx$/)
const isLibModule = isInSourceFolder('src/lib')

function expectNoSourceDependencies(
  from: (file: SourceFile) => boolean,
  to: (file: SourceFile) => boolean,
) {
  expect(findSourceDependencyViolations({ from, to })).toEqual([])
}

describe('frontend architecture layers', () => {
  it('hooks must not depend on components', () => {
    expectNoSourceDependencies(isHook, isComponent)
  })

  it('lib core must not depend on hooks', () => {
    expectNoSourceDependencies(isLibCore, isHook)
  })

  it('lib core must not depend on components', () => {
    expectNoSourceDependencies(isLibCore, isComponent)
  })

  it('lib react modules must not reach back into hooks', () => {
    expectNoSourceDependencies(isLibReactModule, isHook)
  })

  it('lib react modules must not reach back into components', () => {
    expectNoSourceDependencies(isLibReactModule, isComponent)
  })

  it('type modules must stay independent from components', () => {
    expectNoSourceDependencies(isTypeModule, isComponent)
  })

  it('type modules must stay independent from hooks', () => {
    expectNoSourceDependencies(isTypeModule, isHook)
  })

  it('type modules must stay independent from lib modules', () => {
    expectNoSourceDependencies(isTypeModule, isLibModule)
  })
})
