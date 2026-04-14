/** Escapes a single value for CSV output. */
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

/** Builds one CSV line from a list of cell values. */
export function buildCsvLine(values: unknown[]): string {
  return values.map((value) => stringifyCsvCell(value)).join(',')
}
