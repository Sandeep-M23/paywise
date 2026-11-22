import type { GenderGapGroup, PayOutlier } from "@paywise/shared";
import type { GapFilter } from "@/@types";

export function gapKind(g: GenderGapGroup): Exclude<GapFilter, "all"> {
  if (g.suppressed) return "hidden";
  if (g.flagged) return g.significant ? "review" : "chance";
  return "within";
}

export function furthestOutlier(people: PayOutlier[]) {
  const top = [...people].sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))[0];
  return top ? `${top.fullName}, ${top.jobTitle}` : undefined;
}
