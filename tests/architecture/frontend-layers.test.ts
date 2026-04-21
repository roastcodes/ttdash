import { projectFiles } from 'archunit'

describe('frontend architecture layers', () => {
  it('hooks must not depend on components', async () => {
    const rule = projectFiles()
      .inFolder('src/hooks')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/components')

    await expect(rule).toPassAsync()
  })

  it('lib core must not depend on hooks', async () => {
    const rule = projectFiles()
      .inPath('src/lib/**/*.ts')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/hooks')

    await expect(rule).toPassAsync()
  })

  it('lib core must not depend on components', async () => {
    const rule = projectFiles()
      .inPath('src/lib/**/*.ts')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/components')

    await expect(rule).toPassAsync()
  })

  it('lib react modules must not reach back into hooks', async () => {
    const rule = projectFiles()
      .inPath('src/lib/**/*.tsx')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/hooks')

    await expect(rule).toPassAsync({ allowEmptyTests: true })
  })

  it('lib react modules must not reach back into components', async () => {
    const rule = projectFiles()
      .inPath('src/lib/**/*.tsx')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/components')

    await expect(rule).toPassAsync({ allowEmptyTests: true })
  })

  it('type modules must stay independent from components', async () => {
    const rule = projectFiles()
      .inFolder('src/types')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/components')

    await expect(rule).toPassAsync()
  })

  it('type modules must stay independent from hooks', async () => {
    const rule = projectFiles()
      .inFolder('src/types')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/hooks')

    await expect(rule).toPassAsync()
  })

  it('type modules must stay independent from lib modules', async () => {
    const rule = projectFiles()
      .inFolder('src/types')
      .shouldNot()
      .dependOnFiles()
      .inFolder('src/lib')

    await expect(rule).toPassAsync()
  })
})
