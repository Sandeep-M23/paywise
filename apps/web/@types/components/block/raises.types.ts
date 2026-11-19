import type { EmployeeSummary, MANUAL_REVISION_REASONS } from "@paywise/shared";

export type ManualReason = (typeof MANUAL_REVISION_REASONS)[number];

/** A person given their own raise in the planner, as typed. */
export type Individual = { employee: EmployeeSummary; mode: "percent" | "amount"; text: string };
