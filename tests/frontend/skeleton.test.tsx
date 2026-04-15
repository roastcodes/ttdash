// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartCardSkeleton } from '@/components/ui/skeleton'

describe('ChartCardSkeleton', () => {
  it('passes custom body sizing through to the inner chart placeholder', () => {
    const { container } = render(
      <ChartCardSkeleton className="h-[420px]" bodyClassName="h-[420px]" />,
    )

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons).toHaveLength(2)
    expect(skeletons[1]).toHaveClass('h-[420px]')
  })
})
