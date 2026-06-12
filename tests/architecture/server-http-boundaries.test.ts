import { readFileSync } from 'node:fs'
import path from 'node:path'

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

function stripSourceComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

function getModuleSpecifiers(source: string) {
  const sourceWithoutComments = stripSourceComments(source)
  const patterns = [
    /\brequire\(\s*(['"`])([^'"`]+)\1\s*\)/g,
    /\bimport\s+(?:[^'"`]+\s+from\s+)?(['"`])([^'"`]+)\1/g,
    /\bimport\(\s*(['"`])([^'"`]+)\1\s*\)/g,
  ]

  return patterns.flatMap((pattern) =>
    [...sourceWithoutComments.matchAll(pattern)].map((match) => match[2]),
  )
}

const explicitModulePathExtensions = ['.js', '.mjs', '.cjs', '.ts'] as const

function importsModule(specifier: string, modulePath: string) {
  const modulePathVariants = [
    modulePath,
    ...explicitModulePathExtensions.map((extension) => `${modulePath}${extension}`),
  ]

  return modulePathVariants.some(
    (modulePathVariant) =>
      specifier === modulePathVariant || specifier.startsWith(`${modulePathVariant}/`),
  )
}

const serverRouteFiles = [
  'server/routes/auto-import-routes.js',
  'server/routes/http-route-utils.js',
  'server/routes/report-routes.js',
  'server/routes/runtime-routes.js',
  'server/routes/settings-routes.js',
  'server/routes/static-routes.js',
  'server/routes/usage-routes.js',
]

describe('server HTTP boundary contract', () => {
  it('keeps request guard policy behind the HTTP utils facade', () => {
    const routerSource = readRepoFile('server/http-router.js')
    const httpUtilsSource = readRepoFile('server/http-utils.js')
    const requestGuardsSource = readRepoFile('server/http-request-guards.js')

    expect(routerSource).not.toContain('http-request-guards')
    expect(httpUtilsSource).toContain('createHttpRequestGuards')
    expect(httpUtilsSource).toContain('validateRequestHost: requestGuards.validateRequestHost')
    expect(httpUtilsSource).toContain(
      'validateMutationRequest: requestGuards.validateMutationRequest',
    )
    expect(requestGuardsSource).toContain('function createHttpRequestGuards')
  })

  it('keeps host and origin policy out of generic response/body utilities', () => {
    const httpUtilsSource = readRepoFile('server/http-utils.js')
    const requestGuardsSource = readRepoFile('server/http-request-guards.js')

    expect(httpUtilsSource).not.toContain('function hasTrustedOrigin')
    expect(httpUtilsSource).not.toContain('function getHostHeaderHost')
    expect(httpUtilsSource).not.toContain('function hasJsonContentType')
    expect(requestGuardsSource).toContain('function hasTrustedOrigin')
    expect(requestGuardsSource).toContain('function getHostHeaderHost')
    expect(requestGuardsSource).toContain('function hasJsonContentType')
  })

  it('keeps the HTTP router as a route-group composition shell', () => {
    const routerSource = readRepoFile('server/http-router.js')

    expect(routerSource).toContain("require('./routes/usage-routes')")
    expect(routerSource).toContain("require('./routes/settings-routes')")
    expect(routerSource).toContain("require('./routes/auto-import-routes')")
    expect(routerSource).toContain("require('./routes/report-routes')")
    expect(routerSource).toContain("require('./routes/static-routes')")
    expect(routerSource).not.toContain("apiPath === '/settings'")
    expect(routerSource).not.toContain("apiPath === '/upload'")
    expect(routerSource).not.toContain("apiPath === '/report/pdf'")
  })

  it('matches runtime imports with explicit module extensions', () => {
    expect(importsModule('../data-runtime', '../data-runtime')).toBe(true)
    expect(importsModule('../data-runtime/file-locks', '../data-runtime')).toBe(true)
    expect(importsModule('../data-runtime.js', '../data-runtime')).toBe(true)
    expect(importsModule('../data-runtime.mjs/file-locks', '../data-runtime')).toBe(true)
    expect(importsModule('../data-runtime.cjs', '../data-runtime')).toBe(true)
    expect(importsModule('../data-runtime.ts/file-locks', '../data-runtime')).toBe(true)
    expect(importsModule('../data-runtime-extra', '../data-runtime')).toBe(false)
    expect(importsModule('../data-runtime.jsx', '../data-runtime')).toBe(false)
  })

  it('extracts static, dynamic, and template-literal module specifiers', () => {
    expect(
      getModuleSpecifiers(`
        const runtime = require('../data-runtime.js')
        const background = require(\`../background-runtime\`)
        import settingsRoutes from '../routes/settings-routes'
        await import('../auto-import-runtime.js')
      `),
    ).toEqual([
      '../data-runtime.js',
      '../background-runtime',
      '../routes/settings-routes',
      '../auto-import-runtime.js',
    ])
  })

  it('keeps route groups dependent on injected services instead of runtime implementations', () => {
    const forbiddenRuntimeModules = [
      '../data-runtime',
      '../auto-import-runtime',
      '../background-runtime',
      '../http-router',
    ]

    for (const routeFile of serverRouteFiles) {
      const routeImports = getModuleSpecifiers(readRepoFile(routeFile))

      for (const modulePath of forbiddenRuntimeModules) {
        expect(
          routeImports.some((specifier) => importsModule(specifier, modulePath)),
          `${routeFile} must not import ${modulePath} directly`,
        ).toBe(false)
      }
    }
  })
})
