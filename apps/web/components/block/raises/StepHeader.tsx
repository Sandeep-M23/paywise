import type { ReactNode } from "react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StepHeader({
  step,
  title,
  description,
  aside,
}: {
  step: number;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row items-start gap-3">
      <span className="bg-foreground text-background grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <CardTitle className="flex items-center gap-2">
          {title}
          {aside}
        </CardTitle>
        <CardDescription className="mt-1">{description}</CardDescription>
      </div>
    </CardHeader>
  );
}
