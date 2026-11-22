import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AppIcon } from "@/@types";

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  loading = false,
  className,
}: {
  icon: AppIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "warning";
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card ring-border flex h-full items-center gap-3.5 rounded-xl px-4 py-3.5 ring-1",
        className,
      )}
    >
      <span className="bg-muted text-muted-foreground grid size-11 shrink-0 place-items-center rounded-full">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-muted-foreground truncate text-sm">{label}</span>
        <span
          className={cn(
            "truncate text-xl leading-tight font-bold tracking-tight tabular-nums",
            tone === "warning" && "text-warning",
          )}
        >
          {loading ? <Skeleton className="my-0.5 h-6 w-24" /> : value}
        </span>
        {loading ? (
          <Skeleton className="h-3 w-32" />
        ) : (
          <span className="text-muted-foreground truncate text-xs">{hint ?? "\u00a0"}</span>
        )}
      </div>
    </div>
  );
}
