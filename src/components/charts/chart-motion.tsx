import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  AnimationControllerProvider,
  Area,
  AreaRevealShape,
  Bar,
  Line,
  LineDrawShape,
  Pie,
  Scatter,
  matchByDataKey,
  usePlotArea,
  type AreaProps,
  type AreaRevealShapeProps,
  type BarProps,
  type LineDrawShapeProps,
  type LineProps,
  type PieProps,
  type ScatterProps,
} from 'recharts'
import { createChartAnimationController } from './chart-animation-controller'
import { CHART_ANIMATION } from './chart-theme'

interface PlotMotionState {
  ready: boolean
  visible: boolean
  enabled: boolean
  dense: boolean
  repartitioned: boolean
  geometryReady: boolean
  markGeometryReady: () => void
  clipId: string
  register: (finish: () => void) => () => void
}

const PlotMotionContext = createContext<PlotMotionState | null>(null)
const matchDate = matchByDataKey('date')
const matchName = matchByDataKey('name')
const matchCategory = matchByDataKey(
  (payload) =>
    payload['date'] ??
    payload['day'] ??
    payload['name'] ??
    payload['model'] ??
    `${String(payload['rangeStart'])}:${String(payload['rangeEnd'])}`,
)

/** Owns visibility and interruption for one plot, without remounting its surrounding controls. */
export function PlotMotionProvider({
  ready,
  visible,
  enabled,
  data,
  partitionKey,
  children,
}: {
  ready: boolean
  visible: boolean
  enabled: boolean
  data?: readonly unknown[] | undefined
  partitionKey?: string | undefined
  children: ReactNode
}) {
  const id = useId().replace(/:/g, '')
  const finishes = useRef(new Set<() => void>())
  const container = useRef<HTMLDivElement>(null)
  const previousData = useRef(data)
  const [geometryReady, setGeometryReady] = useState(false)
  const markGeometryReady = useCallback(() => setGeometryReady(true), [])
  const partition =
    partitionKey ??
    (data?.[0] && typeof data[0] === 'object' && 'rangeStart' in data[0]
      ? JSON.stringify(
          data.map((row) => {
            const bin = row as { rangeStart: number; rangeEnd: number }
            return [bin.rangeStart, bin.rangeEnd]
          }),
        )
      : data?.[0] &&
          typeof data[0] === 'object' &&
          'date' in data[0] &&
          typeof data[0].date === 'string'
        ? String(data[0].date.length)
        : '')
  const previousPartition = useRef(partition)
  const repartitioned = previousPartition.current !== partition
  const dense = (data?.length ?? 0) >= 1000
  const state = useMemo<PlotMotionState>(
    () => ({
      ready,
      visible,
      enabled,
      dense,
      repartitioned,
      geometryReady,
      markGeometryReady,
      clipId: `plot-reveal-${id}`,
      register: (finish) => {
        finishes.current.add(finish)
        return () => {
          finishes.current.delete(finish)
        }
      },
    }),
    [ready, visible, enabled, dense, repartitioned, geometryReady, markGeometryReady, id],
  )
  useEffect(() => {
    if (!visible || !enabled) [...finishes.current].forEach((finish) => finish())
  }, [visible, enabled])
  useEffect(() => {
    const changed = previousData.current !== data
    previousData.current = data
    previousPartition.current = partition
    if (!changed || (!dense && !repartitioned) || !visible || !enabled) return
    const animation = container.current?.animate?.([{ opacity: 0.68 }, { opacity: 1 }], {
      duration: CHART_ANIMATION.updateDuration,
      easing: CHART_ANIMATION.easing,
    })
    return () => animation?.cancel()
  }, [data, dense, repartitioned, partition, visible, enabled])
  const finish = () => [...finishes.current].forEach((complete) => complete())
  return (
    <div ref={container} className="min-h-0 w-full" onPointerDownCapture={finish}>
      <PlotMotionContext.Provider value={state}>{children}</PlotMotionContext.Provider>
    </div>
  )
}

/** Shares a single browser-animated left-to-right mask across all time-series geometry. */
export function TimeSeriesReveal() {
  const plot = usePlotArea()
  const state = useContext(PlotMotionContext)
  const rect = useRef<SVGRectElement>(null)
  const introduced = useRef(false)
  const hasPlot = Boolean(plot && plot.width > 0)
  useEffect(() => {
    const element = rect.current
    if (!element || !hasPlot || !state?.ready || !state.geometryReady) return
    let firstFrame = 0
    let paintFrame = 0
    const finish = () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(paintFrame)
      introduced.current = true
      element.style.transform = 'scaleX(1)'
      animation?.cancel()
    }
    const animation =
      !introduced.current && state.enabled && state.visible && element.animate
        ? element.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
            duration: CHART_ANIMATION.duration,
            easing: CHART_ANIMATION.easing,
            fill: 'forwards',
          })
        : undefined
    if (introduced.current || !state.enabled || !state.visible || !element.animate) {
      finish()
      return
    }
    if (!animation) return
    animation.pause()
    firstFrame = requestAnimationFrame(() => {
      paintFrame = requestAnimationFrame(() => animation.play())
    })
    animation.onfinish = finish
    const unregister = state.register(finish)
    return () => {
      unregister()
      finish()
    }
  }, [hasPlot, state])
  if (!plot || !state) return null
  return (
    <defs>
      <clipPath id={state.clipId} clipPathUnits="userSpaceOnUse">
        <rect
          ref={rect}
          x={plot.x - 4}
          y={plot.y - 6}
          width={plot.width + 8}
          height={plot.height + 12}
          data-timeseries-reveal
          style={{
            transform: introduced.current || !state.enabled ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: `${plot.x - 4}px ${plot.y}px`,
          }}
        />
      </clipPath>
    </defs>
  )
}

function TimeSeriesLineShape(props: LineDrawShapeProps) {
  const state = useContext(PlotMotionContext)
  const markGeometryReady = state?.markGeometryReady
  const hasPoints = Boolean(props.points?.length)
  useLayoutEffect(() => {
    if (hasPoints) markGeometryReady?.()
  }, [hasPoints, markGeometryReady])
  return (
    <g clipPath={state ? `url(#${state.clipId})` : undefined}>
      <LineDrawShape {...props} visibleLength={null} isEntrance={false} isAnimating={false} />
    </g>
  )
}

function TimeSeriesAreaShape(props: AreaRevealShapeProps) {
  const state = useContext(PlotMotionContext)
  const markGeometryReady = state?.markGeometryReady
  const hasPoints = Boolean(props.points?.length)
  useLayoutEffect(() => {
    if (hasPoints) markGeometryReady?.()
  }, [hasPoints, markGeometryReady])
  return (
    <g clipPath={state ? `url(#${state.clipId})` : undefined}>
      <AreaRevealShape {...props} isEntrance={false} isAnimating={false} animationElapsedTime={1} />
    </g>
  )
}

function useSeriesMotion(instantEntrance: boolean, entranceDuration: number) {
  const state = useContext(PlotMotionContext)
  const latest = useRef(state)
  useLayoutEffect(() => {
    latest.current = state
  }, [state])
  const hasRendered = useRef(false)
  const [controller] = useState(() =>
    createChartAnimationController({
      instantEntrance,
      canAnimate: () =>
        Boolean(
          latest.current?.visible &&
          latest.current.enabled &&
          !latest.current.dense &&
          !latest.current.repartitioned,
        ),
    }),
  )
  const duration = hasRendered.current ? CHART_ANIMATION.updateDuration : entranceDuration
  useEffect(() => {
    if (state?.ready) hasRendered.current = true
  }, [state?.ready])
  useEffect(() => state?.register(controller.finish), [state, controller])
  return { state, controller, duration }
}

/** Draws a line through the shared plot mask and matches updates by their real date. */
export function MotionLine(props: LineProps) {
  const { state, controller } = useSeriesMotion(true, CHART_ANIMATION.duration)
  if (!state) return <Line {...props} />
  if (!state.ready) return null
  return (
    <AnimationControllerProvider value={controller}>
      <Line
        {...props}
        isAnimationActive={state.enabled}
        animationBegin={0}
        animationDuration={CHART_ANIMATION.updateDuration}
        animationMatchBy={props.animationMatchBy ?? matchDate}
        shape={TimeSeriesLineShape}
      />
    </AnimationControllerProvider>
  )
}

/** Reveals filled and stacked areas in sync with every line in their plot. */
export function MotionArea(props: AreaProps<unknown, unknown>) {
  const { state, controller } = useSeriesMotion(true, CHART_ANIMATION.duration)
  if (!state) return <Area {...props} />
  if (!state.ready) return null
  return (
    <AnimationControllerProvider value={controller}>
      <Area
        {...props}
        isAnimationActive={state.enabled}
        animationBegin={0}
        animationDuration={CHART_ANIMATION.updateDuration}
        animationMatchBy={props.animationMatchBy ?? matchDate}
        shape={TimeSeriesAreaShape}
      />
    </AnimationControllerProvider>
  )
}

/** Grows bars from their zero baseline only when their own plot first becomes visible. */
export function MotionBar(props: BarProps<unknown, unknown>) {
  const { state, controller, duration } = useSeriesMotion(false, CHART_ANIMATION.barDuration)
  if (!state) return <Bar {...props} />
  if (!state.ready) return null
  return (
    <AnimationControllerProvider value={controller}>
      <Bar
        {...props}
        isAnimationActive={state.enabled}
        animationBegin={0}
        animationDuration={duration}
        animationMatchBy={props.animationMatchBy ?? matchCategory}
      />
    </AnimationControllerProvider>
  )
}

/** Builds a clockwise donut from twelve o'clock and keeps category identities through updates. */
export function MotionPie(props: PieProps) {
  const { state, controller, duration } = useSeriesMotion(false, CHART_ANIMATION.radialDuration)
  if (!state) return <Pie {...props} />
  if (!state.ready) return null
  return (
    <AnimationControllerProvider value={controller}>
      <Pie
        {...props}
        startAngle={90}
        endAngle={-270}
        isAnimationActive={state.enabled}
        animationBegin={0}
        animationDuration={duration}
        animationMatchBy={props.animationMatchBy ?? matchName}
      />
    </AnimationControllerProvider>
  )
}

/** Keeps scatter points at their true coordinates throughout the plot's opacity reveal. */
export function MotionScatter(props: ScatterProps<unknown, unknown>) {
  const { state, controller } = useSeriesMotion(true, CHART_ANIMATION.revealDuration)
  if (!state) return <Scatter {...props} />
  if (!state.ready) return null
  return (
    <AnimationControllerProvider value={controller}>
      <Scatter {...props} isAnimationActive={false} />
    </AnimationControllerProvider>
  )
}
