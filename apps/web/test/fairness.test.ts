import { describe, expect, it } from "vitest";
import type { GenderGapGroup, PayOutlier } from "@paywise/shared";
import { furthestOutlier, gapKind } from "../utils/helpers/fairness";

const group = (patch: Partial<GenderGapGroup>) =>
  ({ suppressed: false, flagged: false, significant: false, ...patch }) as GenderGapGroup;

describe("gapKind", () => {
  it("classifies a gap by size and confidence, hiding small groups first", () => {
    expect(gapKind(group({ suppressed: true, flagged: true, significant: true }))).toBe("hidden");
    expect(gapKind(group({ flagged: true, significant: true }))).toBe("review");
    expect(gapKind(group({ flagged: true }))).toBe("chance");
    expect(gapKind(group({}))).toBe("within");
  });
});

describe("furthestOutlier", () => {
  const person = (fullName: string, deviation: number) =>
    ({ fullName, jobTitle: "Software Engineer", deviation }) as PayOutlier;

  it("names the person furthest from their peers, either way", () => {
    expect(furthestOutlier([person("A", 0.4), person("B", -0.9), person("C", 0.6)])).toBe(
      "B, Software Engineer",
    );
  });

  it("is undefined for no outliers", () => {
    expect(furthestOutlier([])).toBeUndefined();
  });
});
