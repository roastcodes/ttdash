import { projectSlices } from 'archunit'

const featureDiagram = `
@startuml
  component [anomaly]
  component [auto-import]
  component [cache-roi]
  component [command-palette]
  component [comparison]
  component [drill-down]
  component [forecast]
  component [heatmap]
  component [help]
  component [insights]
  component [limits]
  component [pdf-report]
  component [request-quality]
  component [risk]
  component [settings]
@enduml
`

describe('feature slice boundaries', () => {
  it('keeps feature slices independent from each other', async () => {
    const rule = projectSlices()
      .definedBy('src/components/features/(**)/')
      .should()
      .adhereToDiagram(featureDiagram)

    await expect(rule).toPassAsync()
  })
})
