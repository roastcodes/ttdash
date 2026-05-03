export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createForbiddenImportPattern(importPath: string) {
  const escapedPath = escapeRegex(importPath)
  const importBoundary = importPath.endsWith('/')
    ? escapedPath
    : String.raw`${escapedPath}(?=(?:['"./]|$))`

  return new RegExp(
    String.raw`(?:require\s*\(\s*['"]${importBoundary}|from\s*['"]${importBoundary}|import\s*\(\s*['"]${importBoundary})`,
  )
}
