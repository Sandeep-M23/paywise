import type { EmployeeSummary, MANUAL_REVISION_REASONS } from "@paywise/shared";

export type ManualReason = (typeof MANUAL_REVISION_REASONS)[number];

export type Individual = { employee: EmployeeSummary; mode: "percent" | "amount"; text: string };
