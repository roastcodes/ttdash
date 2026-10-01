import type { ReactNode, SVGProps } from 'react'

export class VisibleIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ target, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  unobserve() {}
  disconnect() {}
}

export function MockSvgContainer({
  children,
  ...props
}: SVGProps<SVGSVGElement> & { children?: ReactNode }) {
  return <svg {...props}>{children}</svg>
}

export function MockSvgGroup({
  children,
  ...props
}: SVGProps<SVGGElement> & { children?: ReactNode }) {
  return <g {...props}>{children}</g>
}
