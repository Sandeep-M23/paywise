import { AlertTriangle, CircleCheck, CircleHelp, EyeOff } from "@/components/Icons";
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
      <Badge variant="outline" className="border-warning/50 text-warning">
        <CircleHelp aria-hidden /> ≥ 5%, may be chance
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-success">
      <CircleCheck aria-hidden /> Within 5%
    </Badge>
  );
}
