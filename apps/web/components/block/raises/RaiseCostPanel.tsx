"use client";

import { RAISE_REASONS } from "@paywise/shared";
import type { ManualReason } from "@/@types";
import { Field } from "@/components/shared/FormField/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { RaisePlan } from "@/hooks/useRaisePlan";
import { cn } from "@/lib/utils";
import { humanize, money } from "@/utils/helpers/others/format";

export function RaiseCostPanel({
  estimate: { requested, cost, costLoading, isFetching, people, individualCount },
  apply: {
    today,
    effectiveOn,
    setEffectiveOn,
    reason,
    setReason,
    note,
    setNote,
    canApply,
    setConfirming,
  },
}: {
  estimate: RaisePlan["estimate"];
  apply: RaisePlan["apply"];
}) {
  return (
    <aside
      aria-label="Cost and apply"
      className={cn(
        "dark bg-sidebar text-foreground flex flex-col gap-5 rounded-xl p-5 lg:sticky lg:top-0",
        isFetching && "transition-opacity [&_[data-cost]]:opacity-60",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="bg-lime text-lime-foreground grid size-7 place-items-center rounded-full text-sm font-bold">
          3
        </span>
        <h2 className="font-semibold">Review and apply</h2>
      </div>

      <div data-cost className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">People getting a raise</span>
        {costLoading ? (
          <Skeleton className="my-1 h-8 w-28" />
        ) : (
          <span className="text-4xl font-bold tracking-tight tabular-nums">
            {people.toLocaleString()}
          </span>
        )}
        <span className="text-muted-foreground text-xs">
          {individualCount > 0
            ? `incl. ${individualCount} individual ${individualCount === 1 ? "raise" : "raises"}`
            : "\u00a0"}
        </span>
      </div>

      <div data-cost className="flex flex-col gap-2">
        <span className="text-muted-foreground text-sm">Added cost per year</span>
        {(!requested || cost?.length === 0) && (
          <p className="text-muted-foreground rounded-lg bg-white/5 px-3 py-3 text-sm">
            {requested ? "Nobody matches this plan." : "Set a group raise or add a person."}
          </p>
        )}
        {costLoading && <Skeleton className="h-16 w-full rounded-lg" />}
        {requested &&
          cost?.map((row) => (
            <div key={row.currency} className="rounded-lg bg-white/5 px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">
                  {row.currency.toUpperCase()}
                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                    {row.headcount.toLocaleString()} people
                  </span>
                </span>
                <span className="text-lime text-lg font-bold tabular-nums">
                  +{money(row.increase, row.currency, undefined, "none")}
                </span>
              </div>
              <div className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                Payroll {money(row.currentTotal, row.currency, undefined, "none")} →{" "}
                {money(row.newTotal, row.currency, undefined, "none")}
              </div>
            </div>
          ))}
        <p className="text-muted-foreground text-xs leading-relaxed">
          Currencies are never added together. Each raise is rounded to the smallest unit, as it
          would be paid.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="effectiveOn"
            label="Effective from"
            hint={
              today && effectiveOn > today
                ? "Scheduled: current salaries stay until then"
                : undefined
            }
          >
            <Input
              id="effectiveOn"
              type="date"
              value={effectiveOn}
              onChange={(e) => setEffectiveOn(e.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ManualReason)}>
              <SelectTrigger id="reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RAISE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {humanize(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            value={note}
            maxLength={500}
            placeholder="e.g. 2026 annual review"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <Button size="lg" disabled={!canApply} onClick={() => setConfirming(true)}>
          Apply raises{people > 0 ? ` to ${people.toLocaleString()}` : ""}
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          You confirm before anything is saved.
        </p>
      </div>
    </aside>
  );
}
