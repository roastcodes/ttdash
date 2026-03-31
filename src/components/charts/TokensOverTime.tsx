import { useMemo, useId } from 'react'
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Line } from 'recharts'
import { ChartCard } from './ChartCard'
import { CustomTooltip } from './CustomTooltip'
import { CHART_COLORS, CHART_MARGIN, CHART_ANIMATION } from './chart-theme'
import { formatTokens, formatDateAxis } from '@/lib/formatters'
import { FormattedValue } from '@/components/ui/formatted-value'
import { CHART_HELP } from '@/lib/help-content'
import type { TokenChartDataPoint } from '@/types'

interface TokensOverTimeProps {
  data: TokenChartDataPoint[]
  onClickDay?: (date: string) => void
}

export function TokensOverTime({ data, onClickDay }: TokensOverTimeProps) {
  const uid = useId()
  const gid = (name: string) => `${uid}-${name}`.replace(/:/g, '')

  const totals = useMemo(() => {
    let cacheRead = 0, cacheWrite = 0, input = 0, output = 0
    for (const d of data) {
      cacheRead += d['Cache Read']
      cacheWrite += d['Cache Write']
      input += d.Input
      output += d.Output
    }
    return { cacheRead, cacheWrite, input, output, total: cacheRead + cacheWrite + input + output }
  }, [data])

  // Total tokens per day for the expanded extra chart
  const totalPerDay = useMemo(() =>
    data.map(d => ({
      date: d.date,
      total: d.Input + d.Output + d['Cache Write'] + d['Cache Read'],
      tokenMA7: d.tokenMA7,
    })),
    [data]
  )

  const handleClick = (e: unknown) => {
    const payload = e as { activePayload?: { payload?: { date?: string } }[] }
    if (payload?.activePayload?.[0]?.payload?.date && onClickDay) {
      onClickDay(payload.activePayload[0].payload.date)
    }
  }

  const totalChart = (
    <div className="mt-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Tokens (alle Typen)</div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={totalPerDay} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id={gid('total')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.cost} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS.cost} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
          <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} />
          <YAxis tickFormatter={formatTokens} stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} axisLine={false} width={55} />
          <Tooltip content={<CustomTooltip formatter={formatTokens} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
          <Area type="monotone" dataKey="total" stroke={CHART_COLORS.cost} fill={`url(#${gid('total')})`} strokeWidth={1.5} name="Total Tokens" animationDuration={CHART_ANIMATION.duration} />
          <Line type="monotone" dataKey="tokenMA7" stroke={CHART_COLORS.ma7} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls name="7-Tage Ø" isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )

  return (
    <ChartCard
      title="Tokens im Zeitverlauf"
      subtitle="Alle Token-Typen mit 7-Tage Ø"
      info={CHART_HELP.tokensOverTime}
      summary={<FormattedValue value={totals.total} type="tokens" />}
      className="lg:col-span-2"
      chartData={data as unknown as Record<string, unknown>[]}
      valueKey="Cache Read"
      valueFormatter={formatTokens}
      expandedExtra={totalChart}
    >
      {/* Summary row with totals per type */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        {([
          { label: 'Cache Read', value: totals.cacheRead, color: CHART_COLORS.cacheRead },
          { label: 'Cache Write', value: totals.cacheWrite, color: CHART_COLORS.cacheWrite },
          { label: 'Output', value: totals.output, color: CHART_COLORS.output },
          { label: 'Input', value: totals.input, color: CHART_COLORS.input },
        ] as const).map(item => (
          <div key={item.label} className="rounded-lg bg-muted/20 p-1.5">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{item.label}</div>
            <div className="text-xs font-mono font-semibold" style={{ color: item.color }}>{formatTokens(item.value)}</div>
            <div className="text-[9px] text-muted-foreground/60 font-mono">
              {totals.total > 0 ? `${((item.value / totals.total) * 100).toFixed(1)}%` : '–'}
            </div>
          </div>
        ))}
      </div>

      {/* Chart 1: Cache Tokens (large scale) with per-type MA7 */}
      <div className="mb-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cache Tokens</div>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={data} margin={{ ...CHART_MARGIN, bottom: 0 }} onClick={handleClick}>
            <defs>
              <linearGradient id={gid('cacheRead')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.cacheRead} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.cacheRead} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={gid('cacheWrite')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.cacheWrite} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.cacheWrite} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
            <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} hide />
            <YAxis tickFormatter={formatTokens} stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} axisLine={false} width={55} />
            <Tooltip content={<CustomTooltip formatter={formatTokens} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
            <Area type="monotone" dataKey="Cache Read" stroke={CHART_COLORS.cacheRead} fill={`url(#${gid('cacheRead')})`} strokeWidth={1.5} name="Cache Read" animationDuration={CHART_ANIMATION.duration} />
            <Area type="monotone" dataKey="Cache Write" stroke={CHART_COLORS.cacheWrite} fill={`url(#${gid('cacheWrite')})`} strokeWidth={1.5} name="Cache Write" animationDuration={CHART_ANIMATION.duration} />
            <Line type="monotone" dataKey="cacheReadMA7" stroke={CHART_COLORS.cacheRead} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls name="Cache Read Ø" isAnimationActive={false} />
            <Line type="monotone" dataKey="cacheWriteMA7" stroke={CHART_COLORS.cacheWrite} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls name="Cache Write Ø" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: I/O Tokens (small scale) with per-type MA7 */}
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Input / Output Tokens</div>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={data} margin={CHART_MARGIN} onClick={handleClick}>
            <defs>
              <linearGradient id={gid('output')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.output} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.output} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={gid('input')} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.input} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.input} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} opacity={0.3} />
            <XAxis dataKey="date" tickFormatter={formatDateAxis} stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} />
            <YAxis tickFormatter={formatTokens} stroke={CHART_COLORS.axis} fontSize={10} tickLine={false} axisLine={false} width={55} />
            <Tooltip content={<CustomTooltip formatter={formatTokens} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
            <Area type="monotone" dataKey="Output" stroke={CHART_COLORS.output} fill={`url(#${gid('output')})`} strokeWidth={1.5} name="Output" animationDuration={CHART_ANIMATION.duration} />
            <Area type="monotone" dataKey="Input" stroke={CHART_COLORS.input} fill={`url(#${gid('input')})`} strokeWidth={1.5} name="Input" animationDuration={CHART_ANIMATION.duration} />
            <Line type="monotone" dataKey="outputMA7" stroke={CHART_COLORS.output} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls name="Output Ø" isAnimationActive={false} />
            <Line type="monotone" dataKey="inputMA7" stroke={CHART_COLORS.input} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls name="Input Ø" isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
