import { cn } from "cn"

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
