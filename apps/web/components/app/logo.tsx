import { cn } from "@/lib/utils";

/**
 * Paywise mark: three rising bars (pay that grows) with a lime "spark", on a dark
 * tile. The tile inverts in dark mode so it stays visible.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <rect
        x="8"
        y="17"
        width="4"
        height="7"
        rx="2"
        className="fill-background"
        fillOpacity="0.55"
      />
      <rect
        x="14"
        y="13"
        width="4"
        height="11"
        rx="2"
        className="fill-background"
        fillOpacity="0.8"
      />
      <rect x="20" y="9" width="4" height="15" rx="2" className="fill-background" />
      <circle cx="24.5" cy="6.5" r="2.5" className="fill-lime" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3 text-lg font-bold tracking-tight", className)}>
      <LogoMark />
      <span>Paywise</span>
    </span>
  );
}
