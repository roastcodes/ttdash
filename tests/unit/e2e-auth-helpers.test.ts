import { afterEach, describe, expect, it } from 'vitest'
import { createApiAuthHeaders, gotoDashboard, readLocalAuthSession } from '../e2e/helpers'

const originalAuthorizationHeader = process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER
const originalBootstrapUrl = process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL

function restoreEnv() {
  if (originalAuthorizationHeader === undefined) {
    delete process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER
  } else {
    process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER = originalAuthorizationHeader
  }

  if (originalBootstrapUrl === undefined) {
    delete process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL
  } else {
    process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL = originalBootstrapUrl
  }
}

describe('E2E auth helpers', () => {
  afterEach(() => {
    restoreEnv()
  })

  it('uses fixture-provided auth environment instead of reading session files', () => {
    process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER = 'Bearer test-token'
    process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL = 'http://127.0.0.1:3015/?ttdash_token=test-token'

    expect(readLocalAuthSession()).toEqual({
      authorizationHeader: 'Bearer test-token',
      bootstrapUrl: 'http://127.0.0.1:3015/?ttdash_token=test-token',
    })
    expect(createApiAuthHeaders()).toEqual({ Authorization: 'Bearer test-token' })
  })

  it('fails clearly when fixture auth environment is missing', () => {
    delete process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER
    process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL = 'http://127.0.0.1:3015/?ttdash_token=test-token'

    expect(() => createApiAuthHeaders()).toThrow(
      'PLAYWRIGHT_TEST_AUTHORIZATION_HEADER is required for Playwright API authentication',
    )
  })

  it('fails clearly when bootstrap URL is missing', () => {
    process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER = 'Bearer test-token'
    delete process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL

    expect(() => readLocalAuthSession()).toThrow(
      'PLAYWRIGHT_TEST_BOOTSTRAP_URL is required for Playwright API authentication',
    )
  })

  it('navigates to the fixture-provided bootstrap URL', async () => {
    process.env.PLAYWRIGHT_TEST_AUTHORIZATION_HEADER = 'Bearer test-token'
    process.env.PLAYWRIGHT_TEST_BOOTSTRAP_URL = 'http://127.0.0.1:3015/?ttdash_token=test-token'
    const page = {
      goto: async (url: string) => ({ url }),
    }

    await expect(gotoDashboard(page as never)).resolves.toEqual({
      url: 'http://127.0.0.1:3015/?ttdash_token=test-token',
    })
  })
})
