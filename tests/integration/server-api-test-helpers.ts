import { beforeEach } from 'vitest'
import sampleUsage from '../../examples/sample-usage.json'
import {
  createSharedServerContext,
  fetchTrusted,
  registerSharedServerLifecycle,
} from './server-test-helpers'

export { sampleUsage }

export function createApiSharedServer() {
  const sharedServer = createSharedServerContext()
  registerSharedServerLifecycle(sharedServer)

  beforeEach(async () => {
    await resetApiState(sharedServer.baseUrl)
  })

  return sharedServer
}

export async function resetApiState(baseUrl: string) {
  const usageResponse = await fetchTrusted(`${baseUrl}/api/usage`, {
    method: 'DELETE',
  })
  if (usageResponse.status !== 200) {
    throw new Error(`Could not reset usage data for integration test: ${usageResponse.status}`)
  }

  const settingsResponse = await fetchTrusted(`${baseUrl}/api/settings`, {
    method: 'DELETE',
  })
  if (settingsResponse.status !== 200) {
    throw new Error(`Could not reset settings for integration test: ${settingsResponse.status}`)
  }
}
