/** Keeps exact numeric boundaries alongside an independently readable axis label. */
export interface DistributionBin {
  label: string
  exactLabel: string
  rangeStart: number
  rangeEnd: number
  count: number
}

/** Preserves every observation and disambiguates compact labels for narrow numeric ranges. */
export function toDistributionBins(
  values: number[],
  formatter: (value: number) => string,
): DistributionBin[] {
  if (values.length === 0) return []
  const min = values.reduce((a, b) => Math.min(a, b), Infinity)
  const max = values.reduce((a, b) => Math.max(a, b), -Infinity)
  if (min === max)
    return [
      {
        label: formatter(min),
        exactLabel: String(min),
        rangeStart: min,
        rangeEnd: max,
        count: values.length,
      },
    ]
  const bucketCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(values.length))))
  const bucketSize = (max - min) / bucketCount
  const edges = Array.from({ length: bucketCount + 1 }, (_, index) =>
    index === bucketCount ? max : min + bucketSize * index,
  )
  let labels = edges.map(formatter)
  if (new Set(labels).size !== edges.length) {
    for (let precision = 3; precision <= 17; precision++) {
      labels = edges.map((value) => String(Number(value.toPrecision(precision))))
      if (new Set(labels).size === edges.length) break
    }
  }
  const bins = Array.from({ length: bucketCount }, (_, index) => ({
    label: `${labels[index]}–${labels[index + 1]}`,
    exactLabel: `${edges[index]}–${edges[index + 1]}`,
    rangeStart: edges[index]!,
    rangeEnd: edges[index + 1]!,
    count: 0,
  }))
  for (const value of values) {
    const index = Math.max(0, Math.min(bucketCount - 1, Math.floor((value - min) / bucketSize)))
    bins[index]!.count++
  }
  return bins
}
