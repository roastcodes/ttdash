import { readFileSync } from 'node:fs'
import path from 'node:path'

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

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
})
