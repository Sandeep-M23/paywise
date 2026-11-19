import { cn } from "cn"

// Local change: a faint, translucent block that fades in after a short delay and
// pulses slowly. The old high-contrast shine flashed on quick loads and looked
// glitchy. Reduced-motion users get the static block straight away.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "bg-skeleton animate-skeleton rounded-md motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
