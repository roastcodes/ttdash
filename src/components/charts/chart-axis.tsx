import { useMemo } from 'react'
import {
  XAxis,
  YAxis,
  usePlotArea,
  useXAxisDomain,
  type XAxisProps,
  type YAxisProps,
} from 'recharts'

/** Leaves breathing room between time/category labels and the zero label on the value axis. */
export function ChartXAxis(props: XAxisProps) {
  const domain = useXAxisDomain(props.xAxisId ?? 0)
  const plot = usePlotArea()
  const ticks = useMemo<XAxisProps['ticks']>(() => {
    if (props.type === 'number' || props.ticks) return props.ticks
    if (!domain || props.hide) return []
    const values: Array<string | number> = []
    for (const value of domain) {
      if (typeof value === 'string' || typeof value === 'number') values.push(value)
    }
    if (values.length !== domain.length || values.length <= 24) return undefined
    const count = Math.min(values.length, Math.max(2, Math.floor((plot?.width ?? 300) / 85)))
    return Array.from(
      { length: count },
      (_, i) => values[Math.round((i * (values.length - 1)) / (count - 1))]!,
    )
  }, [domain, plot?.width, props.type, props.ticks, props.hide])
  // Recharts derives new domain arrays when axis settings change. Keep equal tick lists stable.
  const tickSignature = ticks ? JSON.stringify(ticks) : undefined
  const stableTicks = useMemo<XAxisProps['ticks']>(
    () =>
      tickSignature ? (JSON.parse(tickSignature) as NonNullable<XAxisProps['ticks']>) : undefined,
    [tickSignature],
  )
  return (
    <XAxis
      {...props}
      tickMargin={props.tickMargin ?? 12}
      height={typeof props.height === 'number' ? Math.max(props.height, 36) : 36}
      minTickGap={props.minTickGap ?? 18}
      fontSize={props.fontSize ?? 11}
      {...(stableTicks ? { ticks: props.ticks ?? stableTicks } : {})}
    />
  )
}

/** Uses a consistent value-axis gutter without shrinking text to fit crowded charts. */
export function ChartYAxis(props: YAxisProps) {
  const width = props.width ?? 64
  const maxCharacters = typeof width === 'number' ? Math.max(6, Math.floor((width - 12) / 6.5)) : 16
  const tickFormatter =
    props.tickFormatter ??
    (props.type === 'category'
      ? (value: unknown) => {
          const label = String(value)
          return label.length > maxCharacters ? `${label.slice(0, maxCharacters - 1)}…` : label
        }
      : undefined)
  return (
    <YAxis
      {...props}
      tickMargin={props.tickMargin ?? 8}
      width={width}
      fontSize={props.fontSize ?? 11}
      {...(tickFormatter ? { tickFormatter } : {})}
    />
  )
}
