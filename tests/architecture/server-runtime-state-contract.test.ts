import { readFileSync } from 'node:fs'
import path from 'node:path'

function readRepoFile(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

describe('server runtime state contract', () => {
  it('keeps auto-import stream state outside the HTTP router', () => {
    const routerSource = readRepoFile('server/http-router.js')
    const autoImportRoutesSource = readRepoFile('server/routes/auto-import-routes.js')

    expect(routerSource).not.toContain('autoImportStreamRunning')
    expect(routerSource).not.toContain('acquireAutoImportLease')
    expect(routerSource).toContain('createAutoImportRoutes')
    expect(autoImportRoutesSource).not.toContain('autoImportStreamRunning')
    expect(autoImportRoutesSource).toContain('acquireAutoImportLease')
  })

  it('keeps mutable runtime flags behind runtime-state services', () => {
    const appRuntimeSource = readRepoFile('server/app-runtime.js')
    const autoImportSource = readRepoFile('server/auto-import-runtime.js')

    expect(appRuntimeSource).toContain('createServerRuntimeState')
    expect(appRuntimeSource).not.toContain('startupAutoLoadCompleted: false')
    expect(autoImportSource).not.toContain('let autoImportRunning')
    expect(autoImportSource).not.toContain('latestToktrackVersionCache')
    expect(autoImportSource).not.toContain('latestToktrackVersionLookupPromise')
  })
})
