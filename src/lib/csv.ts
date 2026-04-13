export function stringifyCsvCell(value: unknown): string {
  let stringValue = ''

  if (value == null) return '""'

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    stringValue = String(value)
  } else {
    try {
      stringValue = JSON.stringify(value) ?? ''
    } catch {
      stringValue = ''
    }
  }

  return `"${stringValue.replace(/"/g, '""')}"`
}

export function buildCsvLine(values: unknown[]): string {
  return values.map((value) => stringifyCsvCell(value)).join(',')
}
