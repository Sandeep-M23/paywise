import { AlertTriangle, CircleCheck, CircleHelp, EyeOff } from "@/components/icons";
import type { GenderGapGroup } from "@paywise/shared";
import { Badge } from "@/components/ui/badge";

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
        <AlertTriangle aria-hidden /> Potential disparity (≥ 5%)
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
