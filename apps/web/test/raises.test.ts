import { describe, expect, it } from "vitest";
import type { EmployeeSummary } from "@paywise/shared";
import { parseIndividualRaise } from "../utils/helpers/raises";

const anna = {
  id: "8f6a3a8e-3c43-4b8e-9b0a-2b7f5f9a1c11",
  salary: { amount: 6_000_000, currency: "eur" },
} as EmployeeSummary;

const raise = (mode: "percent" | "amount", text: string) =>
  parseIndividualRaise({ employee: anna, mode, text });

describe("parseIndividualRaise", () => {
  it("accepts a percent between 0 and 100 with up to two decimals", () => {
    expect(raise("percent", "7.5")).toEqual({ employeeId: anna.id, percent: 7.5 });
    expect(raise("percent", "100")).toEqual({ employeeId: anna.id, percent: 100 });
  });

  it("refuses an empty, zero, negative, oversized or over-precise percent", () => {
    expect(raise("percent", " ")).toEqual({ error: "Enter a raise" });
    expect(raise("percent", "0")).toEqual({ error: "0–100%" });
    expect(raise("percent", "-3")).toEqual({ error: "0–100%" });
    expect(raise("percent", "101")).toEqual({ error: "0–100%" });
    expect(raise("percent", "abc")).toEqual({ error: "0–100%" });
    expect(raise("percent", "1.234")).toEqual({ error: "Two decimals at most" });
  });

  it("accepts a new salary above the current one, in minor units", () => {
    expect(raise("amount", "66,000")).toEqual({ employeeId: anna.id, newAmount: 6_600_000 });
  });

  it("refuses a new salary at or below the current one", () => {
    expect(raise("amount", "60,000")).toEqual({ error: "Must be above current" });
    expect(raise("amount", "50000")).toEqual({ error: "Must be above current" });
  });
});
