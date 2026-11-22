import type { EmployeeSummary, RAISE_REASONS } from "@paywise/shared";

export type ManualReason = (typeof RAISE_REASONS)[number];

export type Individual = { employee: EmployeeSummary; mode: "percent" | "amount"; text: string };
