import { collectSourceImportSpecifiers } from './source-graph'

describe('architecture source graph helper', () => {
  it('collects static imports, re-exports, and dynamic imports with options', () => {
    const specifiers = collectSourceImportSpecifiers(
      'source-graph-fixture.ts',
      `
        import { formatCurrency } from '@/lib/formatters'
        import './side-effect'
        export { Dashboard } from './Dashboard'

        const lazyModule = import('./lazy-module', { with: { type: 'json' } })
        void lazyModule
      `,
    )

    expect(specifiers).toEqual([
      '@/lib/formatters',
      './side-effect',
      './Dashboard',
      './lazy-module',
    ])
  })
})
