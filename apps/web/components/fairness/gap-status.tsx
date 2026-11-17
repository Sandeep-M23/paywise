import { AlertTriangle, CircleCheck, CircleHelp, EyeOff } from "lucide-react";
import type { GenderGapGroup } from "@paywise/shared";
import { Badge } from "@/components/ui/badge";

/** Status is always icon + words, never colour alone. */
export function GapStatus({ group }: { group: GenderGapGroup }) {
  if (group.suppressed) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <EyeOff aria-hidden /> Too few to report
      </Badge>
    );
  }
  if (group.flagged && group.significant) {
    return (
      <Badge variant="destructive">
        <AlertTriangle aria-hidden /> Review: gap ≥ 5%
      </Badge>
    );
  }
  if (group.flagged) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-800 dark:text-amber-300">
        <CircleHelp aria-hidden /> ≥ 5%, may be chance
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400">
      <CircleCheck aria-hidden /> Within 5%
    </Badge>
  );
}
