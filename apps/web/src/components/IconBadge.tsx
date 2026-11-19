import { type AppIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** A tinted circle holding an icon, for stat tiles and section headers. */
export function IconBadge({
  icon: Icon,
  tone = "primary",
  className,
}: {
  icon: AppIcon;
  tone?: "primary" | "warning" | "success" | "muted";
  className?: string;
}) {
  const tones = {
    primary: "bg-primary text-primary-foreground",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-full", tones[tone], className)}
    >
      <Icon className="size-4.5" aria-hidden />
    </span>
  );
}
