import { projectFiles } from 'archunit'

describe('hook naming conventions', () => {
  it('keeps hook files on the use-*.ts naming pattern', async () => {
    const rule = projectFiles()
      .inFolder('src/hooks')
      .should()
      .haveName(/^use-(?:[a-z0-9]+(?:-[a-z0-9]+)*)\.ts$/)

    await expect(rule).toPassAsync()
  })
})
