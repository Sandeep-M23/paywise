import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TableFrame({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card ring-border relative flex flex-col overflow-hidden rounded-xl ring-1",
        className,
      )}
    >
      {children}
      {footer !== undefined && <TableFooterBar>{footer}</TableFooterBar>}
    </div>
  );
}

export function TableFooterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex min-h-10 shrink-0 items-center justify-between gap-3 border-t px-4 py-2 text-xs font-medium tabular-nums",
        className,
      )}
    >
      {children}
    </div>
  );
}
