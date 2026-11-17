import { useId } from "react";
import { cn } from "@/lib/utils";

/** Paywise mark: three rising bars (pay that grows) with a lime "spark". */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient
          id={`${id}-bg`}
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9b7bf7" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-bg)`} />
      <rect x="8" y="17" width="4" height="7" rx="2" fill="#fff" fillOpacity="0.55" />
      <rect x="14" y="13" width="4" height="11" rx="2" fill="#fff" fillOpacity="0.8" />
      <rect x="20" y="9" width="4" height="15" rx="2" fill="#fff" />
      <circle cx="24.5" cy="6.5" r="2.5" fill="#bef264" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2.5 text-[15px] font-semibold tracking-tight",
        className,
      )}
    >
      <LogoMark />
      <span>
        Pay<span className="text-primary">wise</span>
      </span>
    </span>
  );
}
