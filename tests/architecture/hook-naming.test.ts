import { getSourceFiles, isInSourceFolder } from './source-graph'

const isHook = isInSourceFolder('src/hooks')
const hookNamePattern = /^use-(?:[a-z0-9]+(?:-[a-z0-9]+)*)\.ts$/

describe('hook naming conventions', () => {
  it('keeps hook files on the use-*.ts naming pattern', () => {
    const invalidHookNames = getSourceFiles()
      .filter(isHook)
      .filter((file) => !hookNamePattern.test(file.name))
      .map((file) => file.relativePath)

    expect(invalidHookNames).toEqual([])
  })
})
