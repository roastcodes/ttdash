import { readFileSync } from 'node:fs'
import path from 'node:path'

const serverEntrypointPath = path.resolve(process.cwd(), 'server.js')

describe('server entrypoint contract', () => {
  it('keeps server.js as a composition root instead of a helper module', () => {
    const source = readFileSync(serverEntrypointPath, 'utf8')

    expect(source).not.toMatch(/^function\s+/m)
    expect(source).not.toMatch(/^async function\s+/m)
    expect(source).not.toContain('__test__')
    expect(source).not.toContain('http.createServer(')
    expect(source).not.toContain('module.exports')
    expect(source).not.toMatch(/\bexports\./)
  })

  it('keeps server.js as an executable shim over the app runtime composer', () => {
    const source = readFileSync(serverEntrypointPath, 'utf8')
    const requirePaths = Array.from(
      source.matchAll(/require\(['"]([^'"]+)['"]\)/g),
      (match) => match[1],
    )

    expect(requirePaths).toEqual(['./server/app-runtime'])
    expect(source).toContain('if (require.main === module)')
    expect(source).toContain('createAppRuntime().bootstrapCli()')
  })
})
