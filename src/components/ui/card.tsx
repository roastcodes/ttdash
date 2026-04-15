import * as React from 'react'
import { motion } from 'framer-motion'
import { useDashboardSectionMotion } from '@/components/dashboard/DashboardMotion'
import { cn } from '@/lib/cn'
import { useShouldReduceMotion } from '@/lib/motion'

type CardProps = React.ComponentPropsWithoutRef<typeof motion.div>

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  const shouldReduceMotion = useShouldReduceMotion()
  const dashboardSectionMotion = useDashboardSectionMotion()
  const staticMotion = {
    initial: false as const,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0 },
  }
  const motionProps =
    shouldReduceMotion || dashboardSectionMotion
      ? staticMotion
      : {
          initial: { opacity: 0, y: 14 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.15 },
          transition: { duration: 0.35, ease: 'easeOut' as const },
        }

  return (
    <motion.div
      ref={ref}
      {...props}
      {...motionProps}
      className={cn(
        'relative rounded-xl border border-border/50 bg-card/80 text-card-foreground shadow-[var(--shadow-card)] backdrop-blur-xl transition-all duration-300 hover:border-border/80 hover:shadow-[var(--shadow-card-hover)] motion-reduce:transition-none',
        className,
      )}
    />
  )
})
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-4', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className, ...props }, ref) => (
    <h3 ref={ref} className={cn('leading-none font-semibold tracking-tight', className)} {...props}>
      {children}
    </h3>
  ),
)
CardTitle.displayName = 'CardTitle'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
  ),
)
CardContent.displayName = 'CardContent'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-muted-foreground', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

export { Card, CardHeader, CardTitle, CardContent, CardDescription }
