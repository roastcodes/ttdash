// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartCardSkeleton } from '@/components/ui/skeleton'

describe('ChartCardSkeleton', () => {
  it('passes custom body sizing through to the inner chart placeholder', () => {
    const { container } = render(
      <ChartCardSkeleton className="outer-shell-marker" bodyClassName="inner-chart-marker" />,
    )

    expect(container.querySelector('.outer-shell-marker')).toBeInTheDocument()
    expect(container.querySelector('.inner-chart-marker')).toBeInTheDocument()
  })
})
