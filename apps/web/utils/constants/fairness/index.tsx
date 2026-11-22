import type { ReactNode } from "react";
import type { DirectionFilter, GapFilter } from "@/@types";
import { AlertTriangle, CircleCheck, CircleHelp, EyeOff } from "@/components/icons";

export const GAP_FILTERS: { value: Exclude<GapFilter, "all">; label: string; icon: ReactNode }[] = [
  {
    value: "review",
    label: "Needs review",
    icon: <AlertTriangle className="text-destructive size-4" aria-hidden />,
  },
  {
    value: "chance",
    label: "May be chance",
    icon: <CircleHelp className="text-warning size-4" aria-hidden />,
  },
  {
    value: "within",
    label: "Within 5%",
    icon: <CircleCheck className="text-success size-4" aria-hidden />,
  },
  {
    value: "hidden",
    label: "Too few to report",
    icon: <EyeOff className="text-muted-foreground size-4" aria-hidden />,
  },
];

export const DIRECTION_FILTERS: {
  value: Exclude<DirectionFilter, "all">;
  label: string;
  icon: ReactNode;
}[] = [
  { value: "above", label: "Above peers", icon: <span aria-hidden>▲</span> },
  { value: "below", label: "Below peers", icon: <span aria-hidden>▼</span> },
];
