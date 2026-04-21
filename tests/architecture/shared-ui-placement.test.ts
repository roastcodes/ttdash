import { projectFiles } from 'archunit'

describe('shared UI placement', () => {
  it('keeps cross-feature UI helpers under src/components/ui', async () => {
    const rule = projectFiles()
      .withName(/^(AnimatedBarFill|FadeIn|InfoButton|info-heading)\.tsx$/)
      .should()
      .beInFolder('src/components/ui')

    await expect(rule).toPassAsync()
  })
})
