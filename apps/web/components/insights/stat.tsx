import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}
