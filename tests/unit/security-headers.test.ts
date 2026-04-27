import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  CSP_NONCE_META_NAME,
  createContentSecurityPolicy,
  createCspNonce,
  createSecurityHeaders,
  injectCspNonceMeta,
  prepareHtmlResponse,
} = require('../../server/security-headers.js') as {
  CSP_NONCE_META_NAME: string
  createContentSecurityPolicy: (options?: { nonce?: string }) => string
  createCspNonce: () => string
  createSecurityHeaders: (options?: { nonce?: string }) => Record<string, string>
  injectCspNonceMeta: (html: string, nonce: string) => string
  prepareHtmlResponse: (html: string) => {
    body: string
    headers: Record<string, string>
    nonce: string
  }
}

describe('security headers', () => {
  it('builds a style CSP without unsafe-inline and blocks style attributes', () => {
    const csp = createContentSecurityPolicy({ nonce: 'test-nonce' })

    expect(csp).toContain("style-src 'self' 'nonce-test-nonce'")
    expect(csp).toContain("style-src-elem 'self' 'nonce-test-nonce'")
    expect(csp).toContain("style-src-attr 'none'")
    expect(csp).not.toContain("'unsafe-inline'")
  })

  it('creates nonces that are safe for CSP nonce sources', () => {
    const nonce = createCspNonce()

    expect(nonce).toMatch(/^[A-Za-z0-9_-]{24}$/)
  })

  it('injects one CSP nonce meta tag into HTML documents', () => {
    const html = '<!doctype html><html><head><title>TTDash</title></head><body></body></html>'
    const withNonce = injectCspNonceMeta(html, 'abc123')
    const reinjected = injectCspNonceMeta(withNonce, 'other')

    expect(withNonce).toContain(`<meta name="${CSP_NONCE_META_NAME}" content="abc123" />`)
    expect(reinjected.match(new RegExp(CSP_NONCE_META_NAME, 'g'))).toHaveLength(1)
  })

  it('injects CSP nonce metadata inside head tags with attributes or mixed case', () => {
    const html = '<!doctype html><html><HEAD data-app="ttdash"><title>TTDash</title></HEAD></html>'
    const withNonce = injectCspNonceMeta(html, 'abc123')

    expect(withNonce).toContain(
      `<HEAD data-app="ttdash">\n    <meta name="${CSP_NONCE_META_NAME}" content="abc123" />`,
    )
  })

  it('prepares HTML with matching nonce metadata and CSP headers', () => {
    const response = prepareHtmlResponse('<!doctype html><html><head></head><body></body></html>')
    const csp = response.headers['Content-Security-Policy']

    expect(response.body).toContain(
      `<meta name="${CSP_NONCE_META_NAME}" content="${response.nonce}" />`,
    )
    expect(csp).toContain(`'nonce-${response.nonce}'`)
    expect(csp).toContain("style-src-attr 'none'")
    expect(csp).not.toContain("'unsafe-inline'")
  })

  it('keeps non-HTML security headers strict without adding a nonce', () => {
    const headers = createSecurityHeaders()
    const csp = headers['Content-Security-Policy']

    expect(csp).toContain("style-src 'self'")
    expect(csp).toContain("style-src-elem 'self'")
    expect(csp).toContain("style-src-attr 'none'")
    expect(csp).not.toContain('nonce-')
    expect(csp).not.toContain("'unsafe-inline'")
  })
})
