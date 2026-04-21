import type { ReactNode, SVGProps } from 'react'

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
