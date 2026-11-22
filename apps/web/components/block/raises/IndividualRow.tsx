"use client";

import { X } from "lucide-react";
import { applyRaise, toMajorString, type RaiseOverride } from "@paywise/shared";
import type { Individual } from "@/@types";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar/EmployeeAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { money } from "@/utils/helpers/others/format";

export function IndividualRow({
  individual: { employee, mode, text },
  result,
  onChange,
  onRemove,
}: {
  individual: Individual;
  result: RaiseOverride | { error: string };
  onChange: (patch: Partial<Individual>) => void;
  onRemove: () => void;
}) {
  const { amount, currency } = employee.salary;
  const next =
    "error" in result
      ? undefined
      : result.newAmount !== undefined
        ? result.newAmount
        : applyRaise(amount, result.percent!);
  return (
    <li className="bg-muted flex flex-col gap-2 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <EmployeeAvatar name={employee.fullName} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{employee.fullName}</p>
          <p className="text-muted-foreground truncate text-xs">
            {employee.jobTitle} · {employee.countryCode}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${employee.fullName}`}
          onClick={onRemove}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-11">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={mode}
          onValueChange={(v) => v && onChange({ mode: v as Individual["mode"], text: "" })}
          aria-label={`Raise type for ${employee.fullName}`}
        >
          <ToggleGroupItem value="percent">%</ToggleGroupItem>
          <ToggleGroupItem value="amount">New salary</ToggleGroupItem>
        </ToggleGroup>
        <Input
          inputMode="decimal"
          aria-label={mode === "percent" ? "Raise %" : "New annual salary"}
          aria-invalid={"error" in result && text !== "" ? true : undefined}
          placeholder={mode === "percent" ? "e.g. 8" : toMajorString(amount, currency)}
          value={text}
          onChange={(e) => onChange({ text: e.target.value })}
          className="bg-card h-8 w-32"
        />
        <span className="text-sm tabular-nums">
          <span className="text-muted-foreground">
            {money(amount, currency, employee.countryCode, "none")}
          </span>
          {next !== undefined && (
            <span className="font-semibold">
              {" → "}
              {money(next, currency, employee.countryCode, "none")}
            </span>
          )}
        </span>
        {"error" in result && text !== "" && (
          <span className="text-destructive text-xs">{result.error}</span>
        )}
      </div>
    </li>
  );
}
