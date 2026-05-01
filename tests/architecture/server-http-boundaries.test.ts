import { readFileSync } from 'node:fs'
import path from 'node:path'

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
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

  it('keeps route groups dependent on injected services instead of runtime implementations', () => {
    for (const routeFile of serverRouteFiles) {
      const routeSource = readRepoFile(routeFile)

      expect(routeSource).not.toContain("require('../data-runtime")
      expect(routeSource).not.toContain("require('../auto-import-runtime")
      expect(routeSource).not.toContain("require('../background-runtime")
      expect(routeSource).not.toContain("require('../http-router")
    }
  })
})
