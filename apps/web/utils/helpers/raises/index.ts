import { parseMoneyInput, type RaiseOverride } from "@paywise/shared";
import type { Individual } from "@/@types";

export function parseIndividualRaise({
  employee,
  mode,
  text,
}: Individual): RaiseOverride | { error: string } {
  if (!text.trim()) return { error: "Enter a raise" };
  if (mode === "percent") {
    const value = Number(text);
    if (!Number.isFinite(value) || value <= 0 || value > 100) return { error: "0–100%" };
    if (Math.round(value * 100) !== value * 100) return { error: "Two decimals at most" };
    return { employeeId: employee.id, percent: value };
  }
  const parsed = parseMoneyInput(text, employee.salary.currency);
  if (!parsed.ok) return { error: parsed.error };
  if (parsed.value <= employee.salary.amount) return { error: "Must be above current" };
  return { employeeId: employee.id, newAmount: parsed.value };
}
