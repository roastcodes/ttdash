export function createBearerAuthHeader(token: string) {
  return `Bearer ${token}`
}
