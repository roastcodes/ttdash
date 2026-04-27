const remoteAuthTokenParts = ['ttdash', 'remote', 'auth', 'test', 'credential', 'only']

export function createRemoteAuthTestToken() {
  return remoteAuthTokenParts.join('-')
}

export function createBearerAuthHeader(token: string) {
  return `Bearer ${token}`
}
