import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/cn'
import { getMotionAwareClasses, useShouldReduceMotion } from '@/lib/motion'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const shouldReduceMotion = useShouldReduceMotion()

  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-lg border border-border/50 bg-popover/90 px-3 py-1.5 text-xs text-popover-foreground shadow-lg shadow-black/10 backdrop-blur-xl duration-200',
        getMotionAwareClasses(shouldReduceMotion, 'animate-in fade-in-0 zoom-in-95'),
        className,
      )}
      {...props}
    />
  )
})
TooltipContent.displayName = 'TooltipContent'

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
