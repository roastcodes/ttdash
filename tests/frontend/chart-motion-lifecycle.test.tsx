import type * as Recharts from 'recharts'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MotionLine, PlotMotionProvider, TimeSeriesReveal } from '@/components/charts/chart-motion'

vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof Recharts>()),
  usePlotArea: () => ({ x: 72, y: 8, width: 200, height: 100 }),
  Line: ({
    shape: Shape,
  }: {
    shape: (props: Partial<Recharts.LineDrawShapeProps>) => React.ReactNode
  }) => (
    <g data-testid="line">
      <Shape points={[{ x: 72, y: 40, value: 1, payload: { date: '2026-04-01' } }]} />
    </g>
  ),
}))

describe('plot entrance and update lifecycle', () => {
  const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
  beforeEach(() =>
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    }),
  )
  afterEach(() => {
    vi.restoreAllMocks()
    if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate)
    else Reflect.deleteProperty(Element.prototype, 'animate')
  })

  it('reserves the SVG without mounting hidden series and finishes the mask on exit', () => {
    const cancel = vi.fn()
    const animate = vi
      .spyOn(Element.prototype, 'animate')
      .mockReturnValue({ cancel, pause: vi.fn(), play: vi.fn() } as unknown as Animation)
    const content = (ready: boolean, visible: boolean) => (
      <PlotMotionProvider ready={ready} visible={visible} enabled>
        <svg>
          <TimeSeriesReveal />
          <MotionLine dataKey="value" />
        </svg>
      </PlotMotionProvider>
    )
    const { rerender } = render(content(false, false))
    expect(screen.queryByTestId('line')).not.toBeInTheDocument()
    expect(animate).not.toHaveBeenCalled()
    rerender(content(true, true))
    expect(screen.getByTestId('line')).toBeInTheDocument()
    expect(animate).toHaveBeenCalledWith(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      expect.objectContaining({ duration: 520 }),
    )
    rerender(content(true, false))
    expect(cancel).toHaveBeenCalledOnce()
    expect(document.querySelector('[data-timeseries-reveal]')).toHaveStyle({
      transform: 'scaleX(1)',
    })
    rerender(content(true, true))
    expect(animate).toHaveBeenCalledOnce()
  })

  it('updates dense geometry once with a short opacity transition, without losing rows', () => {
    const cancel = vi.fn()
    const animate = vi
      .spyOn(Element.prototype, 'animate')
      .mockReturnValue({ cancel, pause: vi.fn(), play: vi.fn() } as unknown as Animation)
    const content = (data: number[]) => (
      <PlotMotionProvider ready visible enabled data={data}>
        <span>{data.length}</span>
      </PlotMotionProvider>
    )
    const { rerender } = render(content(Array.from({ length: 3650 }, (_, i) => i)))
    expect(animate).not.toHaveBeenCalled()
    rerender(content(Array.from({ length: 3650 }, (_, i) => i * 2)))
    expect(screen.getByText('3650')).toBeInTheDocument()
    expect(animate).toHaveBeenCalledWith(
      [{ opacity: 0.68 }, { opacity: 1 }],
      expect.objectContaining({ duration: 200 }),
    )
    rerender(content(Array.from({ length: 3650 }, (_, i) => i * 3)))
    expect(cancel).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledTimes(2)
  })
})
