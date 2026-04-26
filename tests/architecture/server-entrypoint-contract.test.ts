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
  })
})
