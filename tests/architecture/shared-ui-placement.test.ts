import { projectFiles } from 'archunit'

describe('shared UI placement', () => {
  it('keeps cross-feature UI helpers under src/components/ui', async () => {
    const rule = projectFiles()
      .withName(/^(info-button|info-heading|fade-in|animated-bar-fill)\.tsx$/)
      .should()
      .beInFolder('src/components/ui')

    await expect(rule).toPassAsync()
  })
})
