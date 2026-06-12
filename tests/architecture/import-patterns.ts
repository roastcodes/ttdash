export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createForbiddenImportPattern(importPath: string) {
  const escapedPath = escapeRegex(importPath)
  const importPathPattern = importPath.endsWith('/')
    ? String.raw`${escapedPath}[^'"]*`
    : String.raw`${escapedPath}(?:[./][^'"]*)?`
  const quotedImportPath = String.raw`(?:'${importPathPattern}'|"${importPathPattern}")`

  return new RegExp(
    String.raw`(?:require\s*\(\s*${quotedImportPath}|from\s*${quotedImportPath}|import\s*\(\s*${quotedImportPath})`,
  )
}
