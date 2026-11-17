import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { IconBadge } from "@/components/data/visuals";
import { Card, CardContent } from "@/components/ui/card";

export function Stat({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "primary" | "warning" | "success" | "muted";
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="flex items-start justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">{label}</p>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
          {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
        </div>
        {icon && <IconBadge icon={icon} tone={tone} />}
      </CardContent>
    </Card>
  );
}
