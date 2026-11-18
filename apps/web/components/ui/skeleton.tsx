import { cn } from "cn"

// Local change: a light band sweeps across instead of a pulse (the "shine"), so
// loading reads as progress. Reduced-motion users get the static block.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-skeleton",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-skeleton-shine before:to-transparent motion-reduce:before:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
