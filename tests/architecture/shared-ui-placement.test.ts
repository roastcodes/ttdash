import { getSourceFiles, isInSourceFolder } from './source-graph'

const isSharedUiFolder = isInSourceFolder('src/components/ui')
const sharedUiFilePattern = /^(AnimatedBarFill|FadeIn|InfoButton|info-heading)\.tsx$/

describe('shared UI placement', () => {
  it('keeps cross-feature UI helpers under src/components/ui', () => {
    const misplacedSharedUiHelpers = getSourceFiles()
      .filter((file) => sharedUiFilePattern.test(file.name))
      .filter((file) => !isSharedUiFolder(file))
      .map((file) => file.relativePath)

    expect(misplacedSharedUiHelpers).toEqual([])
  })
})
